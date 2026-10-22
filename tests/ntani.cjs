/* Tests Ntani : données et DOM simulés ; aucune donnée policière réelle, aucun navigateur, aucun réseau. */
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const lire=fichier=>fs.readFileSync(path.join(__dirname,'..',fichier),'utf8');
function stockage(initial={}) {
    const valeurs=new Map(Object.entries(initial));
    return {valeurs,ecritures:0,erreur:null,lectureRefusee:false,
        getItem(cle){if(this.lectureRefusee)throw Error('Accès refusé');return valeurs.get(cle)??null;},
        setItem(cle,valeur){if(this.erreur)throw Object.assign(Error('Écriture refusée'),{name:this.erreur});this.ecritures++;valeurs.set(cle,valeur);}
    };
}
function environnement(local=stockage()) {
    const noeuds=new Map(), listes=new Map(), evenements={}, images=[], urls={creees:0,revoquees:[]};
    let doc;
    class Element {
        constructor(balise='div'){this.tagName=balise;this.children=[];this.attributes={};this.events={};this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.files=[];this.dataset={};this.parentElement=null;this.texte='';const classes=new Set();this.classList={add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle:(k,v)=>{if(v===undefined)v=!classes.has(k);v?classes.add(k):classes.delete(k);}};}
        set textContent(texte){this.texte=String(texte);this.children=[];}
        get textContent(){return this.texte+this.children.map(c=>c.textContent||'').join(' ');}
        set innerHTML(_){throw Error('Le rendu de données Ntani ne doit pas utiliser innerHTML.');}
        setAttribute(k,v){this.attributes[k]=v;}
        removeAttribute(k){delete this.attributes[k];if(k==='src')this.src='';}
        append(...elements){elements.forEach(e=>{this.children.push(e);e.parentElement=this;});}
        replaceChildren(...elements){this.children=[];this.texte='';this.append(...elements);}
        remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
        addEventListener(n,f){(this.events[n]||=[]).push(f);}
        async emit(n,e={}){for(const f of this.events[n]||[])await f({preventDefault(){},...e});}
        focus(){doc.activeElement=this;}
        reset(){for(const n of noeuds.values())if(n!==this){n.value='';n.checked=false;}}
    }
    const obtenir=id=>{if(!noeuds.has(id))noeuds.set(id,new Element());return noeuds.get(id);};
    doc={getElementById:obtenir,querySelectorAll:s=>listes.get(s)||[],createElement:b=>new Element(b),head:new Element('head')};
    // Les ressources externes échouent de façon déterministe, sans effectuer de requête.
    doc.head.append=element=>queueMicrotask(()=>element.onerror?.());
    class URLTest extends URL {static createObjectURL(){return 'blob:test-'+(++urls.creees);}static revokeObjectURL(url){urls.revoquees.push(url);}}
    const contexte=vm.createContext({document:doc,localStorage:local,URL:URLTest,setTimeout,clearTimeout,navigator:{},crypto:{randomUUID:()=> 'id-test-'+(local.ecritures+1)},confirm:()=>true,addEventListener:(n,f)=>(evenements[n]||=[]).push(f),Image:class{constructor(){this.naturalWidth=10;this.naturalHeight=10;images.push(this);}}});
    contexte.window=contexte;
    const charger=f=>vm.runInContext(lire(f),contexte,{filename:f});
    charger('ntani-stations.js');
    return {contexte,obtenir,listes,charger,local,Element,images,urls,emettreFenetre:(n)=>{for(const f of evenements[n]||[])f();}};
}
// Fiche technique de test uniquement : aucun de ces objets n'est livré au registre public.
const fiche=modifs=>({id:'test',nom:'Fiche technique de test — sans existence réelle',adresse:'Adresse de test non réelle',quartier:'Test',latitude:0,longitude:0,visible:false,positionConfirmee:false,provenance:'',verification:'',...modifs});
const env=environnement(), api=env.contexte.NtaniStations, cle=api.CLE, repo=api.creerRegistre();
assert.equal(repo.lire().postes.length,0);assert.equal(env.local.ecritures,0);
const reference=environnement();reference.charger('ntani-stations-data.js');
const registreReference=reference.contexte.NtaniStations.creerRegistre();
const unikin=registreReference.lire().postes[0];
assert.equal(unikin.nom,'Police Universitaire — UNIKIN');
assert.equal(unikin.latitude,-4.419830);assert.equal(unikin.longitude,15.307850);
assert.equal(unikin.provenance,'https://www.openstreetmap.org/node/6018228387');
assert.equal(unikin.verification,'2026-10-22');assert.equal(unikin.statutVerification,'documentaire-en-attente-officielle');
assert.equal(unikin.telephonePrincipal,'');assert.equal(unikin.telephoneSecondaire,'');assert.equal(reference.local.ecritures,0);
assert.equal(registreReference.retirer(unikin.id).ok,true);assert.equal(registreReference.lire().postes.length,0);
assert.equal(api.numeroAppel(''),'');assert.equal(api.numeroAppel('+243 xxx xxx'),'');
assert.equal(api.numeroAppel('javascript:alert(1)'),'');assert.equal(api.numeroAppel('+243 000 000 000'),'+243000000000');
assert.equal(api.numeroAppel('00243 000 000 000'),'+243000000000');
assert.equal(api.numeroAppel('1'.repeat(16)),'');
assert.equal(registreReference.enregistrer({...unikin,telephonePrincipal:'<script>'}).ok,false);
assert.equal(registreReference.enregistrer({...unikin,telephoneSecondaire:'+243 xxx xxx'}).ok,false);
assert.equal(registreReference.enregistrer({...unikin,statutVerification:'officielle'}).ok,false);
assert.equal(repo.enregistrer(fiche()).ok,true);assert.equal(repo.lire().postes.length,1);
assert.equal(repo.enregistrer(fiche({nom:'Modification'})).ok,true);assert.equal(repo.lire().postes[0].nom,'Modification');
for(const modification of [
 {latitude:91},{longitude:-181},{latitude:'1e2'},{latitude:''},{latitude:0,longitude:''},
 {nom:' '},{visible:true},{visible:true,positionConfirmee:true},
 {provenance:'javascript:alert(1)'},{provenance:'https://login:secret@example.test/'},
 {verification:'2026-02-31'},{verification:'9999-01-01'},{visible:'oui'}, {nom:'x'.repeat(151)}
]) assert.equal(repo.enregistrer(fiche(modification)).ok,false,JSON.stringify(modification));
const publie=fiche({visible:true,positionConfirmee:true,provenance:'https://example.test/source',verification:'2026-01-01',nom:'Test éphémère'});
assert.equal(repo.enregistrer(publie).ok,true);
assert.equal(api.rechercher(repo.lire().postes,'ephemere','visibles').length,1);
assert.equal(api.rechercher(repo.lire().postes,'absent','visibles').length,0);
assert.equal(api.rechercher(repo.lire().postes,'','masques').length,0);
assert.ok(api.itineraire(publie).includes('to=0%2C0'));
assert.equal(repo.enregistrer({...publie,visible:false}).ok,true);
assert.equal(api.rechercher(repo.lire().postes,'','visibles').length,0);
assert.equal(repo.retirer('test').ok,true);assert.equal(repo.lire().postes.length,0);
assert.equal(api.creerRegistre().lire().postes.length,0);
for(const brut of ['{invalide','null','{"version":2,"postes":[]}',JSON.stringify({version:1,postes:[publie,publie]})]){
 const local=stockage({[cle]:brut}), e=environnement(local), r=e.contexte.NtaniStations.creerRegistre();
 assert.equal(r.lire().lectureSeule,true);assert.equal(r.enregistrer(fiche()).ok,false);assert.equal(local.valeurs.get(cle),brut);assert.equal(local.ecritures,0);
}
const refus=stockage(), eRefus=environnement(refus), rRefus=eRefus.contexte.NtaniStations.creerRegistre();
refus.lectureRefusee=true;assert.equal(rRefus.lire().lectureSeule,true);assert.equal(rRefus.enregistrer(fiche()).ok,false);
refus.lectureRefusee=false;rRefus.lire();
for(const nom of ['QuotaExceededError','SecurityError']){refus.erreur=nom;assert.equal(rRefus.enregistrer(fiche()).ok,false);assert.equal(refus.valeurs.has(cle),false);}
refus.erreur=null;refus.valeurs.set(cle,JSON.stringify({version:1,postes:[publie]}));assert.equal(rRefus.enregistrer(fiche()).ok,false);

function feuilleCartographique(){
 const appels={marqueurs:[],vues:[],cercles:[],tuiles:null};
 const carte={zoomControl:{setPosition(){}},setView(position,zoom){appels.vues.push({position,zoom});return this;},fitBounds(points){appels.cadrage=points;},on(n,f){this[n]=f;return this;},removeLayer(){},remove(){appels.detruite=true;}};
 const couche={events:{},on(n,f){this.events[n]=f;return this;},addTo(){return this;}};appels.tuiles=couche;
 const groupe={clearLayers(){appels.marqueurs=[];},addTo(){return this;}};
 return {appels,L:{map:()=>carte,tileLayer:()=>couche,layerGroup:()=>groupe,divIcon:options=>options,
 marker:(position,options)=>{const m={position,options,events:{},addTo(){return this;},on(n,f){this.events[n]=f;return this;}};appels.marqueurs.push(m);return m;},
 circle:(position,options)=>{appels.cercles.push({position,options});return {addTo(){return this;}};}}};
}
async function executer(){
 const ge=environnement(stockage({[cle]:JSON.stringify({version:1,postes:[publie,fiche({id:'cache'})]})})), feuille=feuilleCartographique();ge.contexte.L=feuille.L;
 ge.charger('ntani-map.js');let demandesGeo=0,succesGeo;
 ge.contexte.navigator.geolocation={getCurrentPosition(succes){demandesGeo++;succesGeo=succes;}};
 ge.charger('ntani-directory.js');
 assert.equal(demandesGeo,0);assert.equal(feuille.appels.vues.length,0);assert.match(ge.obtenir('ntani-station-count').textContent,/1 poste/);
 assert.equal(ge.obtenir('ntani-station-list').children.length,1);
 await ge.obtenir('ntani-locate').emit('click');assert.equal(demandesGeo,0);
 await ge.obtenir('ntani-map-enable').emit('click');assert.equal(feuille.appels.marqueurs.length,1);
 assert.equal(feuille.appels.marqueurs[0].options.icon.html,'<span aria-hidden="true"></span>');
 const boutonPoste=ge.obtenir('ntani-station-list').children[0].children[0];await boutonPoste.emit('click');
 assert.ok(ge.obtenir('ntani-station-detail').textContent.includes(publie.nom));
 assert.ok(ge.obtenir('ntani-station-detail').children.some(n=>n.href?.startsWith('https://www.openstreetmap.org/directions')));
 ge.obtenir('ntani-location-consent').checked=true;await ge.obtenir('ntani-locate').emit('click');assert.equal(demandesGeo,1);
 ge.obtenir('ntani-location-consent').checked=false;await ge.obtenir('ntani-location-consent').emit('change');
 succesGeo({coords:{latitude:1,longitude:1,accuracy:10}});assert.equal(feuille.appels.cercles.length,0);
 ge.obtenir('ntani-location-consent').checked=true;await ge.obtenir('ntani-locate').emit('click');succesGeo({coords:{latitude:1,longitude:1,accuracy:10}});assert.equal(feuille.appels.cercles.length,1);
 feuille.appels.tuiles.events.tileerror();assert.match(ge.obtenir('ntani-map-status').textContent,/indisponibles/);
 feuille.appels.tuiles.events.load();assert.match(ge.obtenir('ntani-map-status').textContent,/indisponibles/);
 ge.obtenir('ntani-station-search').value='inconnu';await ge.obtenir('ntani-station-search').emit('input');assert.equal(feuille.appels.marqueurs.length,0);assert.match(ge.obtenir('ntani-station-list').textContent,/Aucun poste/);
 const panne=environnement();panne.charger('ntani-map.js');
 const resultat=await panne.contexte.NtaniCarte.creer({element:panne.obtenir('carte'),statut:panne.obtenir('statut')});
 assert.equal(resultat,null);assert.match(panne.obtenir('statut').textContent,/liste textuelle/);assert.equal(panne.obtenir('carte').attributes['aria-busy'],'false');
 // Le repère réel fourni n'a aucun lien d'appel avant renseignement explicite de vrais contacts.
 const uni=environnement();uni.charger('ntani-stations-data.js');const feuilleUni=feuilleCartographique();uni.contexte.L=feuilleUni.L;
 uni.charger('ntani-map.js');uni.charger('ntani-directory.js');await uni.obtenir('ntani-map-enable').emit('click');
 assert.deepEqual(Array.from(feuilleUni.appels.marqueurs[0].position),[-4.419830,15.307850]);
 feuilleUni.appels.marqueurs[0].events.click();
 assert.equal(uni.obtenir('ntani-station-detail').children.filter(n=>n.href?.startsWith('tel:')).length,0);
 assert.match(uni.obtenir('ntani-station-detail').textContent,/officielle.*en attente/);
 const contacts=environnement(stockage({[cle]:JSON.stringify({version:1,postes:[{...unikin,telephonePrincipal:'+243 000 000 000',telephoneSecondaire:'+243 000 000 001'}]})}));
 contacts.contexte.NtaniCarte={creer:async()=>null};contacts.charger('ntani-directory.js');
 await contacts.obtenir('ntani-station-list').children[0].children[0].emit('click');
 const liensAppel=contacts.obtenir('ntani-station-detail').children.filter(n=>n.href?.startsWith('tel:'));
 assert.equal(liensAppel.length,2);assert.equal(liensAppel[0].href,'tel:+243000000000');assert.equal(liensAppel[1].href,'tel:+243000000001');
 // L'administration exécute ses gestionnaires réels ; les textes hostiles ne passent jamais par innerHTML.
 const ad=environnement();ad.contexte.NtaniCarte={creer:async()=>null};ad.charger('ntani-admin.js');
 function remplir(poste){for(const [champ,valeur] of Object.entries(poste))if(!['visible','positionConfirmee','id'].includes(champ))ad.obtenir('station-'+champ).value=String(valeur);ad.obtenir('station-visible').checked=poste.visible;ad.obtenir('station-position-confirmed').checked=poste.positionConfirmee;}
 remplir(publie);ad.local.erreur='QuotaExceededError';await ad.obtenir('station-form').emit('submit');assert.match(ad.obtenir('station-feedback').textContent,/saturé/);assert.equal(ad.obtenir('station-nom').value,publie.nom);
 ad.local.erreur=null;await ad.obtenir('station-form').emit('submit');assert.equal(JSON.parse(ad.local.valeurs.get(cle)).postes.length,1);
 const card=ad.obtenir('station-list').children[0], actions=card.children[3];
 await actions.children[0].emit('click');ad.obtenir('station-nom').value='<img src=x onerror=alert(1)>';await ad.obtenir('station-form').emit('input');await ad.obtenir('station-form').emit('submit');
 assert.ok(ad.obtenir('station-list').textContent.includes('<img src=x onerror=alert(1)>'));
 const actions2=ad.obtenir('station-list').children[0].children[3];await actions2.children[1].emit('click');assert.equal(JSON.parse(ad.local.valeurs.get(cle)).postes[0].visible,false);
 ad.contexte.confirm=()=>false;await ad.obtenir('station-list').children[0].children[3].children[2].emit('click');assert.equal(JSON.parse(ad.local.valeurs.get(cle)).postes.length,1);
 ad.contexte.confirm=()=>true;await ad.obtenir('station-list').children[0].children[3].children[2].emit('click');assert.equal(JSON.parse(ad.local.valeurs.get(cle)).postes.length,0);
 const adminUni=environnement(stockage({[cle]:JSON.stringify({version:1,postes:[]})}));adminUni.charger('ntani-stations-data.js');adminUni.contexte.NtaniCarte={creer:async()=>null};adminUni.charger('ntani-admin.js');
 assert.equal(adminUni.obtenir('station-list').children.length,1);assert.match(adminUni.obtenir('station-list').textContent,/Aucun poste/);
 await adminUni.obtenir('station-add-reference').emit('click');
 assert.equal(JSON.parse(adminUni.local.valeurs.get(cle)).postes.length,1);
 assert.equal(adminUni.obtenir('station-nom').value,unikin.nom);
 adminUni.obtenir('station-telephonePrincipal').value='+243 000 000 000';adminUni.obtenir('station-telephoneSecondaire').value='+243 000 000 001';
 await adminUni.obtenir('station-form').emit('submit');
 const ficheUni=JSON.parse(adminUni.local.valeurs.get(cle)).postes[0];assert.equal(ficheUni.id,unikin.id);assert.equal(ficheUni.telephoneSecondaire,'+243 000 000 001');
 const conserve=environnement(stockage({[cle]:JSON.stringify({version:1,postes:[fiche({id:'autre-fiche-conservee'})]})}));conserve.charger('ntani-stations-data.js');
 let clicCarte;conserve.contexte.NtaniCarte={creer:async options=>{clicCarte=options.positionner;return {position(){}};}};conserve.charger('ntani-admin.js');
 await conserve.obtenir('station-add-reference').emit('click');
 assert.equal(JSON.parse(conserve.local.valeurs.get(cle)).postes.length,2);
 await conserve.obtenir('station-map-enable').emit('click');assert.equal(conserve.obtenir('station-position-confirmed').checked,true);
 clicCarte(-4.419830,15.307850);assert.equal(conserve.obtenir('station-position-confirmed').checked,false);
 // Chaque scénario historique alimente le nouveau parcours ; aucun accès au réseau ou au stockage dans ce parcours.
 const donneesScenarios=lire('ntani.js').match(/const data=([\s\S]*?);\s*\/\/ Les nouveaux/)[1];
 const scenarios=vm.runInNewContext('('+donneesScenarios+')');assert.equal(Object.keys(scenarios).length,6);
 for(const [type,scenario] of Object.entries(scenarios)){
  const rapport=environnement();rapport.contexte.NtaniScenarios=scenarios;
  const panneaux=Array.from({length:6},(_,i)=>{const n=new rapport.Element();n.dataset.reportStep=String(i+1);return n;});
  const progression=panneaux.map(()=>new rapport.Element());rapport.listes.set('.ntani-report-step',panneaux);rapport.listes.set('.ntani-report-progress li',progression);
  rapport.charger('ntani-report.js');
  await rapport.obtenir('report-next').emit('click');assert.equal(panneaux[0].hidden,false);assert.match(rapport.obtenir('report-error').textContent,/Choisissez/);
  rapport.obtenir('report-type').value=type;await rapport.obtenir('report-use-example').emit('click');assert.equal(rapport.obtenir('report-description').value,scenario.description);
  for(let i=0;i<3;i++)await rapport.obtenir('report-next').emit('click');assert.equal(panneaux[3].hidden,false);
  rapport.obtenir('report-photo').files=[{type:'image/svg+xml',size:50}];await rapport.obtenir('report-photo').emit('change');await rapport.obtenir('report-next').emit('click');assert.equal(panneaux[3].hidden,false);assert.equal(rapport.urls.creees,0);
  await rapport.obtenir('report-photo-remove').emit('click');rapport.obtenir('report-photo').files=[{type:'image/png',size:50}];await rapport.obtenir('report-photo').emit('change');rapport.images[0].onload();assert.equal(rapport.obtenir('report-photo-preview').hidden,false);
  await rapport.obtenir('report-next').emit('click');assert.equal(panneaux[4].hidden,false);
  await rapport.obtenir('report-next').emit('click');assert.equal(panneaux[4].hidden,false);
  rapport.obtenir('report-acknowledge').checked=true;await rapport.obtenir('report-next').emit('click');assert.equal(panneaux[5].hidden,false);assert.ok(rapport.obtenir('report-summary').textContent.includes(scenario.description));
  assert.equal(rapport.local.ecritures,0);rapport.emettreFenetre('pagehide');assert.equal(rapport.obtenir('report-description').value,'');assert.equal(rapport.obtenir('report-photo-preview').hidden,true);assert.equal(rapport.urls.revoquees.length,1);
  assert.equal(rapport.contexte.NtaniPreparation.verifierPhoto({type:'image/jpeg',size:6*1024*1024}).length>0,true);
  rapport.obtenir('report-photo').files=[{type:'image/png',size:50}];await rapport.obtenir('report-photo').emit('change');
  const enRetard=rapport.images[1];await rapport.obtenir('report-photo-remove').emit('click');enRetard.onload();assert.equal(rapport.obtenir('report-photo-preview').hidden,true);
 }
 assert.ok(lire('ntani.css').includes('body[data-app="ntani"]'));
 assert.ok(lire('ntani-map.js').includes('integrity:'));
 console.log('Réussi : référence UNIKIN, registre vide et réimport explicite, deux contacts et liens tel validés, validation/provenance/position, CRUD et visibilité, erreurs/conflits, rendus texte hostiles, carte et erreurs de tuiles, consentement et callbacks tardifs, six scénarios en six étapes, photos et effacement mémoire. Leaflet et DOM simulés ; aucun rendu visuel contrôlé.');
}
executer().catch(erreur=>{console.error(erreur);process.exitCode=1;});
