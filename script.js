const header = document.querySelector('.header');
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.slider-dot');
const lamps = document.querySelectorAll('.lamp');
const leftArrow = document.querySelector('.arrow-left');
const rightArrow = document.querySelector('.arrow-right');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
let currentSlide = 0;

function showSlide(index) {
  if (index < 0) index = slides.length - 1;
  if (index >= slides.length) index = 0;

  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === index));
  dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
  currentSlide = index;
}

if (leftArrow) leftArrow.addEventListener('click', () => showSlide(currentSlide - 1));
if (rightArrow) rightArrow.addEventListener('click', () => showSlide(currentSlide + 1));
dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));

setInterval(() => showSlide(currentSlide + 1), 3000);

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 20);
}

window.addEventListener('scroll', updateHeader);
header.addEventListener('mouseenter', () => header.classList.add('hovered'));
header.addEventListener('mouseleave', () => header.classList.remove('hovered'));

lamps.forEach(lamp => {
  lamp.dataset.x = '0';
  lamp.dataset.y = '0';
  lamp.dataset.targetX = '0';
  lamp.dataset.targetY = '0';

  lamp.addEventListener('pointerdown', () => {
    lamp.dataset.pressed = 'true';
    lamp.classList.add('pressed');
  });

  lamp.addEventListener('pointerup', () => {
    lamp.dataset.pressed = 'false';
    lamp.classList.remove('pressed');
  });

  lamp.addEventListener('pointercancel', () => {
    lamp.dataset.pressed = 'false';
    lamp.classList.remove('pressed');
  });
});

const hero = document.querySelector('.hero');

hero.addEventListener('pointermove', event => {
  lamps.forEach(lamp => {
    if (lamp.dataset.pressed === 'true') return;

    const rect = lamp.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - event.clientX;
    const dy = rect.top + rect.height / 2 - event.clientY;
    const distance = Math.hypot(dx, dy) || 1;
    const force = Math.max(0, 1 - distance / 260);

    lamp.dataset.targetX = String(Math.max(-100, Math.min(100, dx / distance * force * 100)));
    lamp.dataset.targetY = String(Math.max(-100, Math.min(100, dy / distance * force * 100)));
  });
});

hero.addEventListener('pointerleave', () => {
  lamps.forEach(lamp => {
    lamp.dataset.targetX = '0';
    lamp.dataset.targetY = '0';
  });
});

// Lamp animation speed: 0.09 controls smoothness; lower is slower, higher is faster.
function animateLamps() {
  lamps.forEach(lamp => {
    const x = Number(lamp.dataset.x);
    const y = Number(lamp.dataset.y);
    const targetX = lamp.dataset.pressed === 'true' ? 0 : Number(lamp.dataset.targetX);
    const targetY = lamp.dataset.pressed === 'true' ? 0 : Number(lamp.dataset.targetY);
    const nextX = x + (targetX - x) * 0.09;
    const nextY = y + (targetY - y) * 0.09;

    lamp.dataset.x = String(nextX);
    lamp.dataset.y = String(nextY);
    lamp.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
  });
  requestAnimationFrame(animateLamps);
}

requestAnimationFrame(animateLamps);

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menuButton.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

updateHeader();
