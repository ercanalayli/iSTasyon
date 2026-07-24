const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
const state = { catalog: null, query: '', category: '' };

function visibleProducts() {
  const q = state.query.toLocaleLowerCase('tr-TR');
  return state.catalog.products.filter((product) => {
    const haystack = [product.name, product.brand, product.barcode, product.category].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
    return (!q || haystack.includes(q)) && (!state.category || product.category === state.category) && product.publishApproved === true;
  });
}

function whatsappLink(product) {
  const phone = state.catalog.business.whatsapp.replace(/\D/g, '');
  const message = encodeURIComponent(`Merhaba, ${product.name} hakkında fiyat ve stok bilgisi almak istiyorum.${product.barcode ? ` Barkod: ${product.barcode}` : ''}`);
  return phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
}

function render() {
  const root = document.querySelector('#products');
  root.replaceChildren();
  const products = visibleProducts();
  document.querySelector('#notice').textContent = state.catalog.status === 'preparation'
    ? 'Katalog hazırlanıyor. Onaylanmamış ürün ve fiyatlar yayımlanmaz.'
    : state.catalog.business.deliveryNote;
  for (const product of products) {
    const node = document.querySelector('#product-template').content.cloneNode(true);
    const image = node.querySelector('.product-image');
    image.src = product.imageUrl;
    image.alt = product.name;
    node.querySelector('.category').textContent = product.category;
    node.querySelector('.name').textContent = product.name;
    node.querySelector('.summary').textContent = product.summary || '';
    node.querySelector('.price').textContent = product.priceApproved === true && Number.isFinite(product.salePrice) ? money.format(product.salePrice) : 'Fiyatı sorunuz';
    node.querySelector('.stock').textContent = product.inStock === true ? 'Stokta' : 'Stok teyitli';
    node.querySelector('.order').href = whatsappLink(product);
    root.append(node);
  }
  if (!products.length) root.innerHTML = '<p class="empty">Henüz yayımlanması onaylanmış ürün bulunmuyor.</p>';
}

async function init() {
  const response = await fetch('./catalog.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Katalog yüklenemedi');
  state.catalog = await response.json();
  const categories = [...new Set(state.catalog.products.filter((p) => p.publishApproved === true).map((p) => p.category))].sort();
  const select = document.querySelector('#category');
  for (const category of categories) select.add(new Option(category, category));
  document.querySelector('#search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
  select.addEventListener('change', (event) => { state.category = event.target.value; render(); });
  render();
}

init().catch((error) => { document.querySelector('#notice').textContent = error.message; });
