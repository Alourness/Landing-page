const header = document.querySelector('.header');
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.slider-dot');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
let currentSlide = 0;

function showSlide(index) {
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('active', slideIndex === index);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === index);
  });
  currentSlide = index;
}

dots.forEach((dot, index) => {
  dot.addEventListener('click', () => showSlide(index));
});

setInterval(() => {
  showSlide((currentSlide + 1) % slides.length);
}, 3000);

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 20);
}

window.addEventListener('scroll', updateHeader);
header.addEventListener('mouseenter', () => header.classList.add('hovered'));
header.addEventListener('mouseleave', () => header.classList.remove('hovered'));

menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.classList.toggle('open', isOpen);
  menuButton.setAttribute('aria-expanded', isOpen);
});

updateHeader();
