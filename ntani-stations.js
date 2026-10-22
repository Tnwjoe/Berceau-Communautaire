/* Registre local Ntani : références documentées séparées, aucun lien avec les données de signalement. */
(function (racine) {
    'use strict';
    const CLE = 'ntani.stations.v1';
    const copier = valeur => JSON.parse(JSON.stringify(valeur));
    const limites = { nom:150, adresse:300, quartier:100, telephone:40, telephonePrincipal:40, telephoneSecondaire:40, informations:2000, horaires:300, provenance:1000, verification:10 };
    function numeroAppel(valeur) {
        const texte=String(valeur??'').trim();
        if(!/^\+?[0-9 ().-]+$/.test(texte))return '';
        const numero=texte.replace(/[ ().-]/g,'').replace(/^00/,'+');
        return /^\+?\d{7,15}$/.test(numero)?numero:'';
    }
    function coordonnee(valeur, borne) {
        if (valeur === null || valeur === undefined || String(valeur).trim() === '') return null;
        if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(String(valeur).trim())) throw new Error('Coordonnées : utilisez des degrés décimaux.');
        const nombre = Number(String(valeur).replace(',', '.'));
        if (!Number.isFinite(nombre) || Math.abs(nombre) > borne) throw new Error('Coordonnées hors limites géographiques.');
        return nombre;
    }
    function valider(saisie) {
        if (!saisie || typeof saisie !== 'object' || Array.isArray(saisie)) throw new Error('Fiche de poste invalide.');
        const poste = { ...saisie };
        if (typeof poste.id !== 'string' || !poste.id.trim() || poste.id.length > 150) throw new Error('Identifiant de poste invalide.');
        for (const [champ, limite] of Object.entries(limites)) {
            if (saisie[champ] !== undefined && typeof saisie[champ] !== 'string') throw new Error('Champ textuel invalide : '+champ);
            poste[champ] = (saisie[champ] || '').trim();
            if (poste[champ].length > limite) throw new Error('Champ trop long : '+champ);
        }
        // L'ancien champ reste conservé ; seul un numéro exploitable peut alimenter le champ principal.
        if(saisie.telephonePrincipal===undefined && numeroAppel(poste.telephone))poste.telephonePrincipal=poste.telephone;
        for(const champ of ['telephonePrincipal','telephoneSecondaire'])if(poste[champ]&&!numeroAppel(poste[champ]))throw new Error('Numéro '+(champ==='telephonePrincipal'?'principal':'secondaire')+' invalide : utilisez 7 à 15 chiffres, avec un préfixe + ou 00 facultatif.');
        poste.statutVerification=saisie.statutVerification??'documentaire-en-attente-officielle';
        if(poste.statutVerification!=='documentaire-en-attente-officielle')throw new Error('Ce registre local ne fournit aucune vérification officielle.');
        if (!poste.nom || !poste.adresse) throw new Error('Renseignez le nom et l’adresse du poste.');
        if (typeof saisie.visible !== 'boolean') throw new Error('Visibilité invalide.');
        poste.latitude = coordonnee(saisie.latitude,90); poste.longitude = coordonnee(saisie.longitude,180);
        if ((poste.latitude === null) !== (poste.longitude === null)) throw new Error('Renseignez les deux coordonnées, ou laissez-les toutes deux vides.');
        if (poste.provenance) {
            let url; try { url = new URL(poste.provenance); } catch { throw new Error('Provenance : indiquez une URL de source vérifiable.'); }
            if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Provenance : seules les adresses HTTP(S) sans identifiants sont acceptées.');
        }
        if (poste.verification) {
            const date = new Date(poste.verification+'T00:00:00Z');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(poste.verification) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== poste.verification || poste.verification > new Date().toISOString().slice(0,10)) throw new Error('Date de vérification invalide ou future.');
        }
        if (saisie.positionConfirmee !== undefined && typeof saisie.positionConfirmee !== 'boolean') throw new Error('Confirmation de position invalide.');
        if (poste.visible && (!poste.positionConfirmee || !poste.provenance || !poste.verification || poste.latitude === null)) throw new Error('Pour rendre un poste visible, confirmez sa position, sa provenance et sa date de vérification.');
        return poste;
    }
    function creerRegistre(stockage) {
        let brutLu, lectureSeule=true, postes=[];
        function stockageCourant() { return stockage || racine.localStorage; }
        function lire() {
            try {
                brutLu=stockageCourant().getItem(CLE);
                // Une clé absente affiche les références fournies, sans écriture. Un tableau vide ne les réintroduit jamais.
                if (brutLu === null) postes=(racine.NtaniStationsInitiales||[]).map(valider);
                else {
                    const document=JSON.parse(brutLu);
                    if (document.version!==1 || !Array.isArray(document.postes)) throw new Error();
                    const ids=new Set();
                    postes=document.postes.map(item=>{const poste=valider(item);if(ids.has(poste.id))throw new Error();ids.add(poste.id);return poste;});
                }
                lectureSeule=false;
                return { postes:copier(postes), erreur:'', lectureSeule:false };
            } catch {
                lectureSeule=true; postes=[];
                return { postes:[], erreur:'Registre local inaccessible ou invalide. Les données originales sont conservées ; aucune écriture n’est autorisée. Vérifiez le stockage avant de réessayer.', lectureSeule:true };
            }
        }
        function ecrire(candidats) {
            if (brutLu===undefined) lire();
            if (lectureSeule) return {ok:false,erreur:'Le registre est en lecture seule. Les données originales sont conservées.'};
            try {
                const valides=candidats.map(valider), ids=new Set(valides.map(p=>p.id));
                if(ids.size!==valides.length)throw new Error('Identifiants dupliqués.');
                if(stockageCourant().getItem(CLE)!==brutLu) return {ok:false,erreur:'Le registre a changé dans un autre onglet. Rechargez la liste avant de reprendre la modification ; la saisie est conservée.'};
                const brut=JSON.stringify({version:1,postes:valides});
                stockageCourant().setItem(CLE,brut); brutLu=brut; postes=valides;
                return {ok:true};
            } catch(erreur) {
                return {ok:false,erreur:['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(erreur.name)?'Stockage local saturé. Rien n’a été enregistré ; la saisie est conservée.':(erreur.message || 'Échec de sauvegarde locale. La saisie est conservée.')};
            }
        }
        function enregistrer(saisie) {
            if(brutLu===undefined) lire();
            try {
                const poste=valider(saisie), existe=postes.some(p=>p.id===poste.id);
                return ecrire(existe?postes.map(p=>p.id===poste.id?poste:p):[...postes,poste]);
            } catch(erreur) { return {ok:false,erreur:erreur.message}; }
        }
        function retirer(id) {
            if(brutLu===undefined) lire();
            if(!postes.some(p=>p.id===id))return {ok:false,erreur:'Poste introuvable.'};
            return ecrire(postes.filter(p=>p.id!==id));
        }
        return {lire,enregistrer,retirer};
    }
    function rechercher(postes, recherche='', visibilite='') {
        const simplifier=texte=>String(texte).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
        const termes=simplifier(recherche).trim().split(/\s+/).filter(Boolean);
        return postes.filter(p=>(!visibilite || (visibilite==='visibles'?p.visible:!p.visible)) && termes.every(t=>simplifier([p.nom,p.adresse,p.quartier].join(' ')).includes(t)));
    }
    function itineraire(poste) {
        if(poste.latitude===null || poste.longitude===null)return '';
        // Seule la destination est transmise ; aucune position de l'utilisateur n'est ajoutée.
        return 'https://www.openstreetmap.org/directions?to='+encodeURIComponent(poste.latitude+','+poste.longitude);
    }
    racine.NtaniStations={CLE,valider,coordonnee,numeroAppel,creerRegistre,rechercher,itineraire};
})(typeof window==='object'?window:globalThis);
