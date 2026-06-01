
const search = document.getElementById("search");

if (search) {

    search.addEventListener("keyup", function () {

        let value = search.value.toLowerCase();

        let cards = document.querySelectorAll(".card");

        cards.forEach(card => {

            let text = card.textContent.toLowerCase();

            if (text.includes(value)) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }

        });

    });

}



// Données des professionnels


let professionals =
    JSON.parse(localStorage.getItem("professionals")) || [

        {
            id: 1,
            name: "Dr Ngalula",
            role: "Médecin",
            specialty: "Cardiologue",
            location: "plateau",
            phone: "+243 xxx xxx"
        },

        {
            id: 2,
            name: "Ing. Ndelo",
            role: "Ingénieur informaticien",
            specialty: "programmation et développement web",
            location: "plateau",
            phone: "+243 xxx xxx"
        },

        {
            id: 3,
            name: "mr jhon",
            role: "chauffeur",
            specialty: "transport",
            location: "livulu",
            phone: "+243 xxx xxx"
        },

        {
            id: 4,
            name: "ing. jane",
            role: "electricienne",
            specialty: "installation et maintenance",
            location: "Mbanza lemba",
            phone: "+243 xxx xxx"
        },

        {
            id: 5,
            name: "dr.kitoko",
            role: "medecin",
            specialty: "pediatre",
            location: "cogelos",
            phone: "+243 xxx xxx"
        },

    ];

let editingId = null; // Variable pour suivre l'ID en cours de modification

// Sélection des éléments du DOM

const cards = document.querySelector(".cards");


// Création d'une carte
function createCard(person) {

    return `

    <div class="card">

        <h3>
            <i class="fa-solid fa-user"></i>
            ${person.name}
        </h3>

        <p>
            <strong>${person.role}</strong>
        </p>

        <p>${person.specialty}</p>

        <p>
            <i class="fa-solid fa-location-dot"></i>
            ${person.location}
        </p>

        <p>
            <i class="fa-solid fa-phone"></i>
            ${person.phone}
        </p>

        <button>Contacter</button>

        <button onclick="editProfessional(${person.id})">
    ✏️ Modifier
</button>

        <button onclick="deleteProfessional(${person.id})">
    🗑️ Supprimer
</button>

    </div>

    `;

}


// Affichage des cartes
function displayCards(data) {

    cards.innerHTML = "";

    data.forEach(person => {

        cards.innerHTML += createCard(person);

    });

}

// Filtrage par rôle

function filterCards(role) {

    if (role === "Tous") {

        displayCards(professionals);

    } else {

        const filtered = professionals.filter(person =>
            person.role === role
        );

        displayCards(filtered);

    }

}


// Événement de recherche
search.addEventListener("keyup", function () {

    let value = search.value.toLowerCase();

    let filtered = professionals.filter(person =>

        person.name.toLowerCase().includes(value) ||

        person.role.toLowerCase().includes(value) ||

        person.specialty.toLowerCase().includes(value) ||

        person.location.toLowerCase().includes(value)

    );

    displayCards(filtered);

});


displayCards(professionals);


// Formulaire de contact 
const form = document.getElementById("professionalForm");

console.log(form);


const nameInput = document.getElementById("name");
const roleInput = document.getElementById("role");
const specialtyInput = document.getElementById("specialty");
const locationInput = document.getElementById("location");
const phoneInput = document.getElementById("phone");


//soumission du formulaire
form.addEventListener("submit", function (event) {

    event.preventDefault();

    if (editingId) {

        professionals = professionals.map(person =>

            Number(person.id) === Number(editingId)

                ? {
                    ...person,
                    name: nameInput.value,
                    role: roleInput.value,
                    specialty: specialtyInput.value,
                    location: locationInput.value,
                    phone: phoneInput.value
                }

                : person

        );

        editingId = null;

    } else {

        const newProfessional = {

            id: Date.now(),

            name: nameInput.value,
            role: roleInput.value,
            specialty: specialtyInput.value,
            location: locationInput.value,
            phone: phoneInput.value

        };

        professionals.push(newProfessional);

    }

    localStorage.setItem(
        "professionals",
        JSON.stringify(professionals)
    );

    displayCards(professionals);

    form.reset();

});

function deleteProfessional(id) {

    console.log("ID reçu :", id);

    professionals = professionals.filter(person =>

        Number(person.id) !== Number(id)

    );

    localStorage.setItem(
        "professionals",
        JSON.stringify(professionals)
    );

    displayCards(professionals);

}

editingId = null;
// Fonction de modification
function editProfessional(id) {

    const person = professionals.find(person =>
        Number(person.id) === Number(id)
    );

    nameInput.value = person.name;
    roleInput.value = person.role;
    specialtyInput.value = person.specialty;
    locationInput.value = person.location;
    phoneInput.value = person.phone;

    editingId = id;

}
