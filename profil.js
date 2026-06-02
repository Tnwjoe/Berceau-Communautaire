const profileCard = document.getElementById("profile-card");

// Récupérer l'id sauvegardé
const selectedId = localStorage.getItem(
    "selectedProfessional"
);

// Récupérer tous les professionnels
const professionals =
    JSON.parse(localStorage.getItem("professionals")) || [];

// Trouver le professionnel sélectionné
const person = professionals.find(person =>

    Number(person.id) === Number(selectedId)

);

if (person) {

    profileCard.innerHTML = `

       <div class="profile-icon">

    <i class="fa-solid fa-user"></i>

        </div>
            <h2>${person.name}</h2>

            <p><strong>${person.role}</strong></p>

            <p>${person.specialty}</p>

            <p>📍 ${person.location}</p>

            <p>📞 ${person.phone}</p>

        </div>

    `;

}
