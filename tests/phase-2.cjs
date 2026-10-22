/* Non-régression phase 2 : stockage isolé et gestionnaires réels avec DOM simulé, sans navigateur ni données utilisateur. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const racine = path.resolve(__dirname, '..');
const lire = fichier => fs.readFileSync(path.join(racine, fichier), 'utf8');
function creerStockage(initial = {}) {
    const valeurs = new Map(Object.entries(initial));
    const simulation = { lectureInterdite: false, erreurEcriture: null, ecritures: 0, valeurs,
        getItem(cle) { if (this.lectureInterdite) throw new Error('Accès refusé'); return valeurs.get(cle) ?? null; },
        setItem(cle, valeur) { if (this.erreurEcriture) throw Object.assign(new Error('Échec'), {name:this.erreurEcriture}); this.ecritures++; valeurs.set(cle,valeur); }
    };
    return simulation;
}
function donnees(stockage) {
    const contexte = vm.createContext({window:{},localStorage:stockage});
    vm.runInContext(lire('data.js'), contexte);
    return contexte.window.BC;
}
const stockage = creerStockage(), bc = donnees(stockage);
assert.equal(bc.get('news').length,3);
assert.equal(stockage.ecritures,0);
assert.equal(bc.status('news').etat,'absente');
assert.equal(bc.save('news',[]).ok,true);
assert.equal(donnees(stockage).get('news').length,0);
assert.equal(bc.status('news').lectureSeule,false);
const exemples = bc.get('professionals'); exemples[0].name='Modification mémoire';
assert.equal(bc.get('professionals')[0].name,'Dr Ngalula');
assert.equal(stockage.ecritures,1);
for (const cle of ['professionals','commerces','news']) {
    const local=creerStockage({[cle]:'[]'}), api=donnees(local);
    assert.equal(api.get(cle).length,0);
    assert.equal(api.save(cle,[]).ok,true);
    assert.equal(donnees(local).get(cle).length,0);
}
for (const valeur of ['{incorrect','null','{}','[null]','[{"id":1,"title":"A","author":{}}]']) {
    const s=creerStockage({news:valeur}), api=donnees(s);
    assert.equal(api.get('news').length,0);
    assert.equal(api.status('news').lectureSeule,true);
    assert.equal(api.save('news',[]).ok,false);
    assert.equal(s.valeurs.get('news'),valeur);
    assert.equal(s.ecritures,0);
}
const partiel=creerStockage({news:JSON.stringify([{id:'ancien',title:'Titre',custom:'Préservé'},null])}), apiPartielle=donnees(partiel);
assert.equal(apiPartielle.get('news').length,1);
assert.equal(apiPartielle.save('news',[{id:2,title:'Nouveau'}]).ok,false);
assert.ok(partiel.valeurs.get('news').includes('null'));
const compatible=creerStockage({professionals:JSON.stringify([{id:'001',name:'Ancien',custom:{reference:42}}])}), apiCompatible=donnees(compatible);
const ancien=apiCompatible.get('professionals');
assert.equal(ancien[0].id,'001');
assert.equal(apiCompatible.save('professionals',ancien).ok,true);
assert.equal(JSON.parse(compatible.valeurs.get('professionals'))[0].custom.reference,42);
assert.equal(apiCompatible.save('professionals',[...ancien,...ancien]).ok,false);
assert.equal(apiCompatible.save('inconnue',[]).ok,false);
const circulaire={id:'cercle',name:'Cercle'}; circulaire.reference=circulaire;
assert.equal(apiCompatible.save('professionals',[circulaire]).ok,false);
const inaccessible=creerStockage(); inaccessible.lectureInterdite=true;
const apiIndisponible=donnees(inaccessible);
assert.equal(apiIndisponible.get('news').length,0);
assert.equal(apiIndisponible.save('news',[]).ok,false);
assert.equal(inaccessible.ecritures,0);
const erreurs=creerStockage({news:'[]'}), apiErreurs=donnees(erreurs);
apiErreurs.get('news');
for (const nom of ['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED','SecurityError']) {
    erreurs.erreurEcriture=nom;
    const retour=apiErreurs.save('news',[{id:1,title:'Titre'}]);
    assert.equal(retour.ok,false); assert.match(retour.error,nom==='SecurityError'?/Échec/:/insuffisant/);
    assert.equal(erreurs.valeurs.get('news'),'[]');
}
const concurrent=creerStockage({news:'[]'}), apiConcurrente=donnees(concurrent);
apiConcurrente.get('news'); concurrent.valeurs.set('news','[{"id":2,"title":"Autre onglet"}]');
assert.equal(apiConcurrente.save('news',[]).ok,false);
assert.ok(concurrent.valeurs.get('news').includes('Autre onglet'));

// Le substitut ne calcule aucune géométrie et n'interprète pas le HTML ; les assertions de rendu vérifient l'encodage produit.
function creerDOM() {
    const noeuds=new Map(), listes=new Map(), ecouteurs={};
    const document={activeElement:null,body:null};
    class Element {
        constructor() {
            this.dataset={}; this.attributes={}; this.value=''; this.checked=false; this.hidden=false; this.isConnected=true; this.events={}; this.children=[];
            const classes=new Set(); this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,v)=>{if(v===undefined)v=!classes.has(x);v?classes.add(x):classes.delete(x);}};
        }
        setAttribute(k,v){this.attributes[k]=v;}
        removeAttribute(k){delete this.attributes[k];}
        focus(){document.activeElement=this;}
        contains(element){return this===element || this.children.includes(element);}
        querySelector(selecteur){return obtenir(selecteur);}
        querySelectorAll(selecteur){return listes.get(selecteur)||[];}
        addEventListener(nom,fonction){this.events[nom]=fonction;}
        append(...elements){this.children.push(...elements);}
        prepend(element){this.children.unshift(element);}
        closest(selecteur){return this.cibles?.[selecteur]||null;}
    }
    function obtenir(selecteur){if(!noeuds.has(selecteur))noeuds.set(selecteur,new Element());return noeuds.get(selecteur);}
    Object.assign(document,{body:obtenir('body'),querySelector:obtenir,querySelectorAll:s=>listes.get(s)||[],createElement:()=>new Element(),addEventListener:(n,f)=>(ecouteurs[n]||=[]).push(f),removeEventListener:(n,f)=>{ecouteurs[n]=(ecouteurs[n]||[]).filter(x=>x!==f);}});
    return {document,obtenir,listes,ecouteurs,emettre:(nom,event)=>{for(const f of [...(ecouteurs[nom]||[])])f(event);}};
}
function contexteScript(fichier, initial = {}, page = '') {
    const dom=creerDOM(), local=creerStockage(initial);
    dom.document.body.dataset.page=page;
    const contexte=vm.createContext({document:dom.document,window:{},localStorage:local,URL,URLSearchParams,location:new URL('https://berceau.test/index.html'),confirm:()=>true,FormData:class{constructor(form){this.valeurs=form.valeurs;}get(k){return this.valeurs[k]??null;}}});
    vm.runInContext(lire('data.js'),contexte); contexte.BC=contexte.window.BC;
    vm.runInContext(lire(fichier),contexte);
    return {...dom,contexte,local,eval:code=>vm.runInContext(code,contexte)};
}
const publicTest=contexteScript('app.js');
const attaque='x" onmouseover="alert(1) <script>attaque</script> & ? #';
publicTest.contexte.attaque=attaque;
const carte=publicTest.eval('newsCard({id:attaque,title:attaque,category:attaque,summary:attaque,author:attaque})');
assert.ok(carte.includes('id='+encodeURIComponent(attaque)));
assert.ok(!carte.includes('<script>')); assert.ok(!carte.includes(' onmouseover="'));
const pro=publicTest.eval('proCard({id:attaque,name:attaque,role:attaque,specialty:attaque,location:attaque})');
assert.ok(pro.includes('data-id="'+publicTest.contexte.BC.esc(attaque)+'"'));
assert.ok(!pro.includes('data-id="x" onmouseover='));
// Un champ inconnu reste stocké, mais ne doit jamais être converti implicitement en texte de recherche.
publicTest.contexte.objetInconnu={id:'pro',name:'Pro',custom:{toString:'non appelable',valueOf:'non appelable'}};
assert.doesNotThrow(()=>publicTest.eval('proCard(objetInconnu)'));
assert.equal(publicTest.eval('displayAuthor("Centre SantéPlus")'),'Centre SantéPlus');
assert.notEqual(publicTest.eval('feedDomId("a/b")'),publicTest.eval('feedDomId("a?b")'));
assert.equal(publicTest.eval('localImagePath("https://externe.test/piste.png")'),'');
assert.equal(publicTest.eval('localImagePath("javascript:alert(1)")'),'');
const fil=contexteScript('app.js',{news:JSON.stringify([{id:'007',title:'Titre',category:'Environnement',author:'Collectif réel',summary:'Texte'}])},'news');
const htmlFil=fil.obtenir('#news-grid').innerHTML;
assert.ok(htmlFil.includes('Collectif réel')); assert.ok(htmlFil.includes('Environnement'));
assert.ok(!htmlFil.includes('Vie communautaire'));

const admin=contexteScript('admin.js',{news:'[]',professionals:'[]',commerces:'[]'});
assert.equal(admin.eval('dateActualite("31 février 2026")').toString(),'NaN');
assert.equal(admin.eval('dateActualite("14 août 2026")'),Date.UTC(2026,7,14));
assert.equal(admin.eval('dateActualite("2026-08-14")'),Date.UTC(2026,7,14));
assert.equal(admin.eval('plusRecent([{id:1,date:"12 août 2026"},{id:2,date:"14 août 2026"}],true).id'),2);
assert.equal(admin.eval('plusRecent([{id:1,name:"Ancien"}])'),undefined);
admin.contexte.attaque=attaque;
assert.ok(!admin.eval('row("professionals",{id:attaque,name:attaque,role:attaque})').includes('data-id="x" onmouseover='));
admin.contexte.objetInconnu=publicTest.contexte.objetInconnu;
assert.doesNotThrow(()=>admin.eval('row("professionals",objetInconnu)'));
for (const expression of [
    'verifierChamps("news",{title:"   "})',
    'verifierChamps("news",{title:"Titre",date:"31 février 2026"})',
    'verifierChamps("commerces",{tunza:"javascript:alert(1)"})',
    'verifierChamps("professionals",{phone:"<script>"})',
    'verifierChamps("news",{title:"a".repeat(201)})'
]) assert.throws(()=>admin.eval(expression));
assert.equal(admin.eval('verifierChamps("commerces",{tunza:"#tunza-a-venir"}).tunza'),'#tunza-a-venir');
assert.equal(admin.eval('verifierChamps("professionals",{phone:"+243 xxx xxx"}).phone'),'+243 xxx xxx');
function ouvrirActualite(id) {
    admin.eval('form("news"'+(id!==undefined?','+JSON.stringify(id):'')+')');
    const formulaire=admin.obtenir('#admin-form');
    formulaire.valeurs={title:'Titre réel',category:'Environnement',date:'2026-10-22',author:'Auteur réel',summary:'Résumé',content:'Contenu'};
    return formulaire;
}
function soumettre(formulaire){formulaire.onsubmit({preventDefault(){},target:formulaire});}
const declencheur=admin.obtenir('#add-item'); declencheur.focus();
let formulaire=ouvrirActualite();
admin.local.erreurEcriture='QuotaExceededError'; soumettre(formulaire);
assert.equal(admin.obtenir('#admin-form-error').hidden,false);
assert.equal(admin.obtenir('#admin-modal').classList.contains('open'),true);
assert.equal(formulaire.valeurs.title,'Titre réel'); assert.equal(admin.local.valeurs.get('news'),'[]');
admin.local.erreurEcriture=null; soumettre(formulaire);
let actualites=JSON.parse(admin.local.valeurs.get('news'));
assert.equal(actualites.length,1); assert.equal(actualites[0].author,'Auteur réel');
assert.ok(actualites[0].createdAt); assert.equal(admin.obtenir('#admin-modal').classList.contains('open'),false);
const id=actualites[0].id;
formulaire=ouvrirActualite(String(id)); formulaire.valeurs.title='Titre modifié'; soumettre(formulaire);
actualites=JSON.parse(admin.local.valeurs.get('news'));
assert.equal(actualites.length,1); assert.equal(actualites[0].id,id); assert.equal(actualites[0].title,'Titre modifié');
// Un identifiant historique textuel doit rester éditable sans conversion en Number.
admin.local.valeurs.set('news',JSON.stringify([{...actualites[0],id:'ancien-007',custom:'À préserver'}]));
formulaire=ouvrirActualite('ancien-007'); soumettre(formulaire);
assert.equal(JSON.parse(admin.local.valeurs.get('news'))[0].custom,'À préserver');
// Une écriture concurrente pendant l'édition doit conserver à la fois la nouvelle valeur stockée et la saisie ouverte.
formulaire=ouvrirActualite('ancien-007');
const autreVersion=JSON.stringify([{id:'autre',title:'Autre onglet'}]);
admin.local.valeurs.set('news',autreVersion); soumettre(formulaire);
assert.equal(admin.local.valeurs.get('news'),autreVersion);
assert.equal(admin.obtenir('#admin-modal').classList.contains('open'),true);
assert.match(admin.obtenir('#admin-form-error').textContent,/autre onglet/);
admin.eval('closeModal()');
admin.local.valeurs.set('news',JSON.stringify([{id:'ancien-007',title:'À supprimer'}]));
const bouton=admin.obtenir('.delete-item'); bouton.dataset={key:'news',id:'ancien-007'}; bouton.cibles={'.delete-item':bouton};
admin.contexte.confirm=()=>false; admin.emettre('click',{target:bouton});
assert.equal(JSON.parse(admin.local.valeurs.get('news')).length,1);
admin.contexte.confirm=()=>true; admin.local.erreurEcriture='SecurityError'; admin.emettre('click',{target:bouton});
assert.equal(JSON.parse(admin.local.valeurs.get('news')).length,1);
admin.local.erreurEcriture=null; admin.emettre('click',{target:bouton});
assert.equal(JSON.parse(admin.local.valeurs.get('news')).length,0);
assert.equal(admin.contexte.BC.get('news').length,0);
admin.local.valeurs.set('professionals',JSON.stringify([{id:'pro-1',name:'Pro',certified:false}]));
const caseStatut=admin.obtenir('.cert-toggle'); caseStatut.matches=s=>s==='.cert-toggle'; caseStatut.dataset={key:'professionals',id:'pro-1'}; caseStatut.checked=true;
admin.local.erreurEcriture='QuotaExceededError'; admin.emettre('change',{target:caseStatut});
assert.equal(caseStatut.checked,false); assert.equal(JSON.parse(admin.local.valeurs.get('professionals'))[0].certified,false);
admin.local.erreurEcriture=null; caseStatut.checked=true; admin.emettre('change',{target:caseStatut});
assert.equal(JSON.parse(admin.local.valeurs.get('professionals'))[0].certified,true);
// Boucle clavier et restauration du focus lors d'une fermeture sans sauvegarde.
const premier=admin.obtenir('.modal-close'), dernier=admin.obtenir('dernier');
admin.listes.set('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]',[premier,dernier]);
declencheur.focus(); ouvrirActualite(); dernier.focus();
let empeche=false; admin.emettre('keydown',{key:'Tab',preventDefault(){empeche=true;}});
assert.equal(empeche,true); assert.equal(admin.document.activeElement,premier);
admin.emettre('keydown',{key:'Escape',preventDefault(){}});
assert.equal(admin.obtenir('#admin-modal').classList.contains('open'),false);
assert.equal(admin.document.activeElement,declencheur);
// Modale professionnelle : même contrat clavier que la modale commerce, sans sa variante de style.
const dialogue=publicTest.obtenir('#detail-modal'), carteDialogue=publicTest.obtenir('.modal-card'), fermeture=publicTest.obtenir('.modal-close');
carteDialogue.children=[fermeture];
publicTest.listes.set('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',[fermeture]);
const sourceFocus=publicTest.obtenir('déclencheur'); sourceFocus.focus(); publicTest.eval('modal("<h2>Profil</h2>")');
assert.equal(carteDialogue.attributes['aria-modal'],'true');
assert.equal(dialogue.classList.contains('tunza-modal'),false);
assert.equal(publicTest.document.activeElement,fermeture);
publicTest.emettre('keydown',{key:'Escape',preventDefault(){}});
assert.equal(publicTest.document.activeElement,sourceFocus);
assert.equal(dialogue.classList.contains('open'),false);
const contact=creerDOM();
const scriptContact=lire('form.html').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(scriptContact,{document:contact.document});
const champsContact={nom:'Test',email:'test@example.test',message:'À conserver'};
let efface=false;
contact.obtenir('#avisForm').onsubmit({preventDefault(){},target:{...champsContact,reset(){efface=true;}}});
assert.equal(efface,false);
assert.match(contact.obtenir('#resultat').textContent,/Aucun message envoyé/);
assert.equal(contact.document.activeElement,contact.obtenir('#resultat'));
console.log('Réussi : collections absentes/vides, données invalides préservées, compatibilité, quotas, conflits, encodage HTML/URL, auteurs/catégories, CRUD et certifications, erreurs avec saisie conservée, dates, clavier et contact sans envoi. DOM simulé ; aucun rendu visuel vérifié.');
