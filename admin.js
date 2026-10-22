const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)], esc = BC.esc;
let current = 'dashboard', retourFocus = null;
const labels = { dashboard: 'Tableau de bord', news: 'Actualités', professionals: 'Professionnels', commerces: 'Commerces', certifications: 'Certifications (démo)' };
const limites = { title: 200, name: 150, category: 80, role: 100, specialty: 200, location: 150, phone: 30, date: 40, summary: 1000, content: 20000, description: 2000, tunza: 1000, author: 150 };
const memeId = (a, b) => String(a) === String(b);

// Les dates historiques françaises restent lisibles, sans dépendre de Date.parse sur un texte localisé.
function dateActualite(texte) {
    const valeur = String(texte || '').trim();
    let annee, mois, jour;
    if (/^\d{4}-\d{2}-\d{2}$/.test(valeur)) [annee, mois, jour] = valeur.split('-').map(Number);
    else {
        const parties = /^(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})$/i.exec(valeur);
        if (!parties) return NaN;
        jour = Number(parties[1]); annee = Number(parties[3]);
        mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'].indexOf(parties[2].toLowerCase()) + 1;
    }
    const date = new Date(Date.UTC(annee, mois - 1, jour));
    return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour ? date.getTime() : NaN;
}
function plusRecent(items, actualite = false) {
    return items.map(item => ({ item, date: actualite ? dateActualite(item.date) : Date.parse(item.updatedAt || item.createdAt || '') }))
        .filter(element => Number.isFinite(element.date)).sort((a, b) => b.date - a.date)[0]?.item;
}
function dashboard() {
    const n = BC.get('news'), p = BC.get('professionals'), c = BC.get('commerces');
    const recente = plusRecent(n, true), commerce = plusRecent(c);
    return `<div class="stat-grid">${[[n.length,'Actualités','newspaper'],[p.length,'Professionnels','user-group'],[c.length,'Commerces','store'],[p.filter(x=>x.certified).length,'Statuts professionnels de démonstration','user-check'],[c.filter(x=>x.certified).length,'Statuts commerciaux de démonstration','certificate']].map(([nombre,libelle,icone])=>`<div class="stat-card"><i class="fa-solid fa-${icone}"></i><strong>${nombre}</strong><span>${libelle}</span></div>`).join('')}</div><div class="admin-panel"><div class="panel-head"><h2>Activité récente</h2></div><div style="padding:20px"><p><b>${esc(recente?.title || (n.length ? 'Date de publication non déterminable' : 'Aucune actualité'))}</b><br><span class="meta">Dernière actualité selon sa date de publication</span></p><p><b>${esc(commerce?.name || (c.length ? 'Aucune date de modification disponible' : 'Aucun commerce'))}</b><br><span class="meta">Dernier commerce modifié localement ; historique non disponible pour les anciennes fiches</span></p></div></div>`;
}
function table(key) {
    const data = BC.get(key);
    return `<div class="admin-panel"><div class="panel-head"><input class="admin-search" id="admin-search" aria-label="Rechercher dans les données locales" placeholder="Rechercher..."><button class="btn primary" id="add-item"><i class="fa-solid fa-plus"></i>&nbsp; Ajouter</button></div><table class="admin-table"><thead><tr><th>Nom / Titre</th><th>Catégorie / Métier</th><th>Localisation / Date</th><th>Statut de démonstration</th><th>Actions</th></tr></thead><tbody id="admin-rows">${data.map(x=>row(key,x)).join('')}</tbody></table></div>`;
}
function row(key, x) {
    const news = key === 'news', pro = key === 'professionals';
    return `<tr data-text="${esc(Object.values(x).filter(valeur=>['string','number','boolean'].includes(typeof valeur)).join(' ').toLowerCase())}"><td><b>${esc(news?x.title:x.name)}</b></td><td>${esc(news?x.category:(pro?x.role:x.category))}</td><td>${esc(news?x.date:x.location)}</td><td>${news?'—':`<label class="switch"><input class="cert-toggle" data-key="${esc(key)}" data-id="${esc(x.id)}" type="checkbox" ${x.certified?'checked':''}> <span class="cert-label">${x.certified?'Oui (démo)':'Non'}</span></label>`}</td><td><div class="row-actions"><button class="icon-btn edit-item" data-key="${esc(key)}" data-id="${esc(x.id)}" aria-label="Modifier ${esc(news?x.title:x.name)}"><i class="fa-solid fa-pen"></i></button><button class="icon-btn danger delete-item" data-key="${esc(key)}" data-id="${esc(x.id)}" aria-label="Supprimer ${esc(news?x.title:x.name)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`;
}
function certifications() {
    const items = [...BC.get('professionals').map(x=>({...x,key:'professionals',type:x.role})), ...BC.get('commerces').map(x=>({...x,key:'commerces',type:x.category}))];
    return `<div class="admin-panel"><div class="panel-head"><h2>Statuts de démonstration — aucune certification réelle</h2></div><table class="admin-table"><thead><tr><th>Acteur</th><th>Type</th><th>Statut local</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.type)}</td><td><label class="switch"><input class="cert-toggle" data-key="${esc(x.key)}" data-id="${esc(x.id)}" type="checkbox" ${x.certified?'checked':''}> Statut de démonstration</label></td></tr>`).join('')}</tbody></table></div>`;
}
function signaler(message, erreur = false) {
    const zone = $('#admin-feedback'); zone.textContent = message; zone.hidden = false;
    zone.setAttribute('role', erreur ? 'alert' : 'status');
}
function render() {
    $('#view-title').textContent = labels[current];
    $('#admin-view').innerHTML = current==='dashboard' ? dashboard() : current==='certifications' ? certifications() : table(current);
    const recherche = $('#admin-search');
    if (recherche) recherche.oninput = () => $$('#admin-rows tr').forEach(r=>r.hidden=!r.dataset.text.includes(recherche.value.toLowerCase()));
    const ajouter = $('#add-item'); if (ajouter) ajouter.onclick = () => form(current);
    BC.showStorageStatus();
}
function verifierChamps(key, saisie) {
    const resultat = {};
    for (const [champ, brut] of Object.entries(saisie)) {
        const valeur = String(brut ?? '').trim();
        const facultatif = ['author','tunza'].includes(champ);
        if ((!valeur && !facultatif) || valeur.length > limites[champ]) throw new Error(`Champ ${champ} : ${facultatif?'au maximum':'de 1 à'} ${limites[champ]} caractères attendus.`);
        resultat[champ] = valeur;
    }
    if (key === 'news' && !Number.isFinite(dateActualite(resultat.date))) throw new Error('Date invalide : utilisez AAAA-MM-JJ ou une date française complète, par exemple 14 août 2026.');
    if (resultat.phone && !/^\+?[\d ()xX.-]{7,30}$/.test(resultat.phone)) throw new Error('Téléphone invalide : utilisez des chiffres, espaces, parenthèses ou tirets. Les anciens numéros fictifs avec x restent acceptés.');
    if (resultat.tunza) {
        let url; try { url = new URL(resultat.tunza, location.href); } catch { throw new Error('Lien Tunza invalide.'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Lien Tunza : utilisez une adresse HTTP(S), un chemin relatif ou une ancre, sans identifiants de connexion.');
    }
    return resultat;
}
function form(key, id) {
    const data = BC.get(key), edition = id !== undefined, item = edition ? data.find(x=>memeId(x.id,id)) : {};
    if (!item) return signaler('Cet élément n’est plus disponible. Rechargez la vue.', true);
    const news = key==='news', pro = key==='professionals';
    const fields = news ? [['title','Titre'],['category','Catégorie'],['date','Date'],['author','Auteur (facultatif)'],['summary','Résumé'],['content','Contenu']] : pro ? [['name','Nom'],['role','Métier'],['specialty','Spécialité'],['location','Localisation'],['phone','Téléphone']] : [['name','Nom'],['category','Catégorie'],['description','Description'],['location','Localisation'],['phone','Téléphone'],['tunza','Lien Tunza (facultatif)']];
    openModal(`<form id="admin-form" class="admin-form"><h2 id="admin-form-title">${edition?'Modifier':'Ajouter'} ${news?'une actualité':pro?'un professionnel':'un commerce'}</h2><p id="admin-form-error" class="notice" role="alert" tabindex="-1" hidden></p><div class="form-grid">${fields.map(([n,l])=>`<div class="${['summary','content','description'].includes(n)?'full':''}"><label for="admin-${n}">${l}</label>${['summary','content','description'].includes(n)?`<textarea id="admin-${n}" name="${n}" maxlength="${limites[n]}" required>${esc(item[n]??'')}</textarea>`:`<input id="admin-${n}" name="${n}" maxlength="${limites[n]}" value="${esc(item[n]??'')}" ${['author','tunza'].includes(n)?'':'required'}>`}</div>`).join('')}${news?'':`<label class="full switch"><input name="certified" type="checkbox" ${item.certified?'checked':''}> Statut de démonstration — aucune certification réelle</label>`}<button class="btn primary full" type="submit">Enregistrer localement</button></div></form>`);
    $('#admin-form').onsubmit = e => {
        e.preventDefault(); const erreur = $('#admin-form-error'); erreur.hidden = true;
        try {
            const fd = new FormData(e.target), saisie = Object.fromEntries(fields.map(([n])=>[n,fd.get(n)]));
            const valeurs = verifierChamps(key, saisie);
            // La collection capturée à l'ouverture sert de version ; BC.save refuse les changements concurrents.
            let identifiant = Date.now(); while (data.some(x=>memeId(x.id,identifiant))) identifiant++;
            const next = {...item,...valeurs,id:edition?item.id:identifiant,updatedAt:new Date().toISOString()};
            if (!edition) next.createdAt = next.updatedAt;
            if (!news) next.certified = fd.get('certified')==='on';
            if (news) { next.author = next.author || 'Rédaction Berceau communautaire'; next.icon = next.icon || 'fa-newspaper'; }
            else if (!pro) next.icon = next.icon || 'fa-store';
            const sauvegarde = BC.save(key,edition?data.map(x=>memeId(x.id,id)?next:x):[...data,next]);
            if (!sauvegarde.ok) throw new Error(sauvegarde.error);
            const declencheur = retourFocus;
            render(); closeModal();
            // Le rendu remplace les boutons : retrouver l'action correspondante avant de restituer le focus.
            const cible = edition ? $$('.edit-item').find(b=>memeId(b.dataset.id,id)) : $('#add-item');
            (cible || (declencheur?.isConnected ? declencheur : $('#view-title')))?.focus();
            signaler('Modification enregistrée dans ce navigateur uniquement.');
        } catch (cause) { erreur.textContent = cause.message; erreur.hidden = false; erreur.focus(); }
    };
}
function openModal(html) {
    const m = $('#admin-modal'); retourFocus = document.activeElement;
    $('.modal-content',m).innerHTML = html;
    const carte = $('.modal-card',m); carte.setAttribute('role','dialog'); carte.setAttribute('aria-modal','true'); carte.setAttribute('aria-labelledby','admin-form-title');
    m.classList.add('open'); document.body.classList.add('modal-open');
    $('.modal-close',m).onclick = closeModal;
    m.onclick = e => { if(e.target===m) closeModal(); };
    $('.modal-content input',m)?.focus();
}
function closeModal() {
    $('#admin-modal').classList.remove('open'); document.body.classList.remove('modal-open');
    if (retourFocus?.isConnected) retourFocus.focus();
}
// La capture maintient le focus dans la modale, même après une tentative de tabulation hors de celle-ci.
document.addEventListener('keydown', e => {
    const m = $('#admin-modal'); if (!m.classList.contains('open')) return;
    if (e.key==='Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key!=='Tab') return;
    const boutons = $$('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]',m);
    const premier = boutons[0], dernier = boutons[boutons.length-1];
    if (!m.contains(document.activeElement) || (e.shiftKey && document.activeElement===premier) || (!e.shiftKey && document.activeElement===dernier)) { e.preventDefault(); (e.shiftKey?dernier:premier)?.focus(); }
});
$('.admin-sidebar nav').onclick = e => {
    const b = e.target.closest('button'); if(!b || !Object.hasOwn(labels,b.dataset.view)) return;
    current=b.dataset.view; $$('.admin-sidebar nav button').forEach(x=>x.classList.toggle('active',x===b));
    $('.admin-sidebar').classList.remove('open'); $('#admin-feedback').hidden=true; render();
};
$('#admin-menu').onclick = () => $('.admin-sidebar').classList.toggle('open');
document.addEventListener('click', e => {
    const del=e.target.closest('.delete-item'), edit=e.target.closest('.edit-item');
    if(edit) form(edit.dataset.key,edit.dataset.id);
    if(del && confirm('Supprimer cet élément du navigateur courant ?')) {
        const key=del.dataset.key, id=del.dataset.id, data=BC.get(key);
        if(!data.some(x=>memeId(x.id,id))) return signaler('Élément introuvable.',true);
        const resultat=BC.save(key,data.filter(x=>!memeId(x.id,id)));
        if(!resultat.ok) return signaler(resultat.error,true);
        render(); $('#add-item')?.focus(); signaler('Élément supprimé localement.');
    }
});
document.addEventListener('change', e => {
    if(!e.target.matches('.cert-toggle')) return;
    const key=e.target.dataset.key, id=e.target.dataset.id;
    if(!['professionals','commerces'].includes(key)) return;
    const data=BC.get(key), item=data.find(x=>memeId(x.id,id));
    if(!item) return signaler('Élément introuvable.',true);
    const resultat=BC.save(key,data.map(x=>memeId(x.id,id)?{...x,certified:e.target.checked,updatedAt:new Date().toISOString()}:x));
    if(!resultat.ok) { e.target.checked=!!item.certified; return signaler(resultat.error,true); }
    const libelle=e.target.parentElement?.querySelector('.cert-label');
    if(libelle) libelle.textContent=e.target.checked?'Oui (démo)':'Non';
    signaler('Statut de démonstration enregistré localement ; aucune certification réelle.');
});
render();
