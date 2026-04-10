/* Toast del admin — independiente del toast de la tienda */
let _timer = null;

export function showToast(txt) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = txt;
  t.classList.remove('translate-y-48', 'opacity-0');
  t.classList.add('translate-y-0', 'opacity-100');
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    t.classList.add('translate-y-48', 'opacity-0');
    t.classList.remove('translate-y-0', 'opacity-100');
    _timer = null;
  }, 3000);
}