const commerces = [  // Liste des commerces

    {
        id: 1,
        name: "Restaurant Le manioc",
        category: "Restaurant",
        location: "Plateau",
        phone: " +243 xxx xxx xxx",
    },

    {
        id: 2,
        name: "Boulangerie Lumière",
        category: "Boulangerie",
        location: "Kindele",
        phone: " +243 xxx xxx xxx",
    },

    {
        id: 3,
        name: "La pepinière",
        category: "Boutique d'aliment bio",
        location: "UNIKIN",
        phone: " +243 xxx xxx xxx",
    },
    {
        id: 4,
        name: "Pharmacie SantePlus",
        category: "Pharmacie",
        location: "Plateau",
        phone: " +243 xxx xxx xxx",
    },

    {
        id: 5,
        name: "Gaby shop",
        category: "Boutique en ligne",
        location: "Gombe",
        phone: " +243 xxx xxx xxx",
    }


];
// Sauvegarder les commerces dans le localStorage
const container =
    document.querySelector(".commerce-cards");
// Récupérer les éléments du formulaire
const form =
    document.getElementById("commerceForm");
//nom
const commerceName =
    document.getElementById("commerceName");
//catégorie
const commerceCategory =
    document.getElementById("commerceCategory");
//localisation
const commerceLocation =
    document.getElementById("commerceLocation");
//téléphone
const commercePhone =
    document.getElementById("commercePhone");
//recherche
const searchCommerce =
    document.getElementById("searchCommerce");
//recherche de commerce
searchCommerce.addEventListener("keyup", function () {

    const value =
        searchCommerce.value.toLowerCase();

    const filtered =
        commerces.filter(commerce =>

            commerce.name
                .toLowerCase()
                .includes(value)

            ||

            commerce.category
                .toLowerCase()
                .includes(value)

            ||

            commerce.location
                .toLowerCase()
                .includes(value)

        );

    displayCommerces(filtered);

});



// Ajouter un nouvel commerce
form.addEventListener("submit", function (event) {

    event.preventDefault();

    const newCommerce = {

        id: Date.now(),

        name: commerceName.value,

        category: commerceCategory.value,

        location: commerceLocation.value,

        phone: commercePhone.value

    };

    commerces.push(newCommerce);

    displayCommerces();

    form.reset();

});

// Afficher les commerces sur la page
function displayCommerces(data = commerces) {

    container.innerHTML = "";

    data.forEach(commerce => {

        container.innerHTML += `

        <div class="card">

            <h3>

                <i class="fa-solid fa-shop"></i>

                ${commerce.name}

            </h3>

            <p>${commerce.category}</p>

            <p>

                📍 ${commerce.location}

            </p>

            <p>

                📞 ${commerce.phone}

            </p>

            <button
          onclick="deleteCommerce(${commerce.id})">

           🗑️ Supprimer

          </button>


        </div>

            `;

    });

}

displayCommerces();


function deleteCommerce(id) {

    const confirmation =
        confirm(
            "Supprimer ce commerce ?"
        );

    if (!confirmation) {
        return;
    }

    commerces =
        commerces.filter(commerce =>

            Number(commerce.id)
            !== Number(id)

        );

    displayCommerces();

}