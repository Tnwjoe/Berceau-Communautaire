(function(){const defaults={professionals:[{id:1,name:'Dr Ngalula',role:'Médecin',specialty:'Cardiologue',location:'Plateau',phone:'+243 xxx xxx',certified:true},{id:2,name:'Ing. Ndelo',role:'Ingénieur',specialty:'Programmation et développement web',location:'Plateau',phone:'+243 xxx xxx',certified:true},{id:3,name:'M. Jhon',role:'Chauffeur',specialty:'Transport de proximité',location:'Livulu',phone:'+243 xxx xxx',certified:false},{id:4,name:'Ing. Jane',role:'Électricienne',specialty:'Installation et maintenance',location:'Mbanza-Lemba',phone:'+243 xxx xxx',certified:true},{id:5,name:'Dr Kitoko',role:'Médecin',specialty:'Pédiatre',location:'Cogelos',phone:'+243 xxx xxx',certified:false}],commerces:[{id:1,name:'Restaurant Le Manioc',category:'Restaurant',location:'Plateau',phone:'+243 xxx xxx xxx',description:'Cuisine congolaise généreuse dans un cadre convivial.',certified:true,icon:'fa-utensils',tunza:'#tunza-a-venir'},{id:2,name:'Boulangerie Lumière',category:'Alimentation',location:'Kindele',phone:'+243 xxx xxx xxx',description:'Pains, viennoiseries et douceurs préparés chaque matin.',certified:true,icon:'fa-bread-slice',tunza:'#tunza-a-venir'},{id:3,name:'La Pépinière',category:'Alimentation',location:'UNIKIN',phone:'+243 xxx xxx xxx',description:'Produits biologiques et alimentation locale de saison.',certified:false,icon:'fa-seedling',tunza:'#tunza-a-venir'},{id:4,name:'Pharmacie SantéPlus',category:'Santé',location:'Plateau',phone:'+243 xxx xxx xxx',description:'Conseils, produits de santé et service de proximité.',certified:true,icon:'fa-prescription-bottle-medical',tunza:'#tunza-a-venir'},{id:5,name:'Gaby Shop',category:'Mode',location:'Gombe',phone:'+243 xxx xxx xxx',description:'Sélection mode et accessoires, disponible en ligne.',certified:false,icon:'fa-bag-shopping',tunza:'#tunza-a-venir'}],news:[{id:1,title:"Coupure d’électricité prévue aujourd’hui",category:'Communauté',date:'14 août 2026',summary:"Une panne de transformateur affecte la zone de l’Université de Kinshasa. Le retour est prévu vers 18h.",content:"Une interruption temporaire de l’alimentation électrique touche aujourd’hui une partie du quartier. La panne provient d’un transformateur situé dans la zone de l’Université de Kinshasa. Les équipes techniques sont mobilisées et annoncent un retour progressif du courant vers 18h. Les habitants et étudiants sont invités à prendre leurs dispositions.",icon:'fa-bolt',author:'Rédaction Berceau'},{id:2,title:'Les travaux de voirie avancent dans le quartier',category:'Communauté',date:'12 août 2026',summary:"Les travaux visent à améliorer les routes et l’écoulement des eaux.",content:"Les travaux de rénovation se poursuivent dans plusieurs rues. Ils permettront d’améliorer la circulation et l’écoulement des eaux. Des perturbations temporaires sont à prévoir.",icon:'fa-road',author:'Rédaction Berceau'},{id:3,title:'Journée santé et prévention ce samedi',category:'Santé',date:'10 août 2026',summary:'Des consultations et conseils gratuits seront proposés aux familles.',content:'Les professionnels de santé du quartier organisent une journée de prévention ouverte à tous. Des conseils, contrôles de base et temps d’échange sont prévus.',icon:'fa-heart-pulse',author:'Centre SantéPlus'}]};

// Une lecture ne réécrit jamais le stockage : les valeurs endommagées restent récupérables.
const etats = {}, instantanes = {};
const champs = {
    professionals: ['name', 'role', 'specialty', 'location', 'phone'],
    commerces: ['name', 'category', 'location', 'phone', 'description', 'icon', 'tunza', 'image'],
    news: ['title', 'category', 'date', 'summary', 'content', 'icon', 'author']
};
const copie = valeur => JSON.parse(JSON.stringify(valeur));
const esc = valeur => String(valeur ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function verifier(cle, valeur) {
    if (!Object.hasOwn(champs, cle) || !Array.isArray(valeur)) return { donnees: [], valide: false };
    const ids = new Set();
    const donnees = valeur.filter(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const idValide = typeof item.id === 'string' ? item.id.trim().length > 0 : Number.isSafeInteger(item.id);
        const nom = item[cle === 'news' ? 'title' : 'name'];
        if (!idValide || ids.has(String(item.id)) || typeof nom !== 'string' || !nom.trim()) return false;
        if (!champs[cle].every(champ => item[champ] === undefined || typeof item[champ] === 'string')) return false;
        if (item.certified !== undefined && typeof item.certified !== 'boolean') return false;
        if (['createdAt','updatedAt'].some(champ => item[champ] !== undefined && (typeof item[champ] !== 'string' || !Number.isFinite(Date.parse(item[champ]))))) return false;
        ids.add(String(item.id));
        return true;
    });
    return { donnees: copie(donnees), valide: donnees.length === valeur.length };
}
function get(cle) {
    if (!Object.hasOwn(champs, cle)) return [];
    try {
        const brut = localStorage.getItem(cle);
        instantanes[cle] = brut;
        if (brut === null) {
            etats[cle] = { etat: 'absente', message: '', lectureSeule: false };
            return copie(defaults[cle]);
        }
        let resultat;
        try { resultat = verifier(cle, JSON.parse(brut)); }
        catch { resultat = { donnees: [], valide: false }; }
        etats[cle] = resultat.valide
            ? { etat: 'valide', message: '', lectureSeule: false }
            : { etat: 'invalide', message: 'Certaines données locales sont illisibles ou invalides. Leur contenu original est conservé ; cette collection reste en lecture seule pour éviter toute perte.', lectureSeule: true };
        return resultat.donnees;
    } catch {
        etats[cle] = { etat: 'indisponible', message: 'Le stockage local est inaccessible. Aucune donnée ne peut être enregistrée et aucun exemple ne remplace vos données.', lectureSeule: true };
        return [];
    }
}
function save(cle, valeur) {
    if (!Object.hasOwn(champs, cle)) return { ok: false, error: 'Collection inconnue.' };
    // Refuser un écrasement si la lecture était incomplète ou si un autre onglet a écrit depuis.
    if (!Object.hasOwn(instantanes, cle)) get(cle);
    if (etats[cle]?.lectureSeule) return { ok: false, error: etats[cle].message };
    let validation;
    try { validation = verifier(cle, valeur); }
    catch { return { ok: false, error: 'Enregistrement refusé : les données ne sont pas sérialisables.' }; }
    if (!validation.valide) return { ok: false, error: 'Enregistrement refusé : structure invalide ou identifiants dupliqués.' };
    try {
        if (localStorage.getItem(cle) !== instantanes[cle]) return { ok: false, error: 'Les données ont changé dans un autre onglet. Rechargez la vue avant de réessayer ; vos saisies sont conservées.' };
        const brut = JSON.stringify(valeur);
        localStorage.setItem(cle, brut);
        instantanes[cle] = brut;
        return { ok: true };
    } catch (erreur) {
        return { ok: false, error: ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(erreur?.name)
            ? 'Espace de stockage local insuffisant. Rien n’a été enregistré ; vos saisies sont conservées.'
            : 'Échec de sauvegarde locale. Vérifiez les autorisations du navigateur ; vos saisies sont conservées.' };
    }
}
function showStorageStatus() {
    const messages = [...new Set(Object.values(etats).map(etat => etat.message).filter(Boolean))];
    let zone = document.querySelector('#storage-status');
    if (!zone && messages.length) {
        zone = document.createElement('p'); zone.id = 'storage-status'; zone.className = 'notice';
        zone.setAttribute('role', 'status'); zone.setAttribute('aria-live', 'polite');
        (document.querySelector('main') || document.body).prepend(zone);
    }
    if (zone) { zone.textContent = messages.join(' '); zone.hidden = !messages.length; }
}
window.BC = { defaults, get, save, esc, showStorageStatus, status: cle => ({ ...etats[cle] }) };
})();
