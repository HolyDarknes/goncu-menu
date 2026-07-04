// ======================================
// GÖNCÜ MENU MODAL SYSTEM v1.0
// ======================================

const modal = document.getElementById("productModal");

const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDescription = document.getElementById("modalDescription");

const closeButton = document.querySelector(".modal-close");
const overlay = document.querySelector(".modal-overlay");

let menuItems = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {

    menuItems = [...document.querySelectorAll(".menu-item")];

    menuItems.forEach((item,index)=>{

        item.style.cursor="pointer";

        item.addEventListener("click",()=>{

            currentIndex=index;

            openModal(item);

        });

    });

});


function openModal(item){

    const image=item.querySelector("img");

    const title=item.querySelector(".item-name");

    const price=item.querySelector(".item-price");

    const description=item.querySelector(".item-description");

    if(image){

        modalImage.src=image.src;

        modalImage.alt=image.alt;

    }

    modalTitle.innerText=title ? title.innerText : "";

    modalPrice.innerText=price ? price.innerText : "";

    modalDescription.innerText=description ? description.innerText : "";

    modal.classList.add("active");

    document.body.style.overflow="hidden";

}


function closeModal(){

    modal.classList.remove("active");

    document.body.style.overflow="";

}

closeButton.addEventListener("click",closeModal);

overlay.addEventListener("click",closeModal);

document.addEventListener("keydown",(e)=>{

    if(e.key==="Escape"){

        closeModal();

    }

});
