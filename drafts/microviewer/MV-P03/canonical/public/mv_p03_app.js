// MV-P03 canonical client for the Micro Viewer package.

const tiles = [
  {
    id: 'granite-01',
    title: 'Granite cross-section',
    src: 'https://images.unsplash.com/photo-1520697222861-7e013fedf8a1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'basalt-02',
    title: 'Basalt vesicles',
    src: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'sandstone-03',
    title: 'Sandstone cement',
    src: 'https://images.unsplash.com/photo-1530023367847-a683933f4177?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'gneiss-04',
    title: 'Gneiss foliation bands',
    src: 'https://images.unsplash.com/photo-1529927066849-66bce1bfe8c0?auto=format&fit=crop&w=800&q=80',
  },
];

const stageImage = document.getElementById('mv-stage-image');
const tileList = document.getElementById('mv-tile-list');
const randomButton = document.getElementById('mv-random-button');
const tileTemplate = document.getElementById('mv-tile-item-template');

function renderTiles() {
  const fragment = document.createDocumentFragment();

  tiles.forEach((tile, index) => {
    const node = tileTemplate.content.firstElementChild.cloneNode(true);
    const button = node.querySelector('button');
    button.dataset.tileId = tile.id;
    button.textContent = tile.title;
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.addEventListener('click', () => selectTile(tile.id));
    fragment.appendChild(node);
  });

  tileList.appendChild(fragment);
}

function selectTile(tileId) {
  const tile = tiles.find((candidate) => candidate.id === tileId) ?? tiles[0];
  stageImage.src = tile.src;
  stageImage.alt = tile.title;

  tileList.querySelectorAll('button').forEach((button) => {
    const isActive = button.dataset.tileId === tile.id;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function selectRandomTile() {
  const next = tiles[Math.floor(Math.random() * tiles.length)];
  selectTile(next.id);
}

function initialise() {
  renderTiles();
  selectTile(tiles[0].id);
  randomButton.addEventListener('click', selectRandomTile);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const buttons = Array.from(tileList.querySelectorAll('button'));
    const activeIndex = buttons.findIndex((button) => button.classList.contains('is-active'));
    if (activeIndex === -1) return;

    const nextIndex = event.key === 'ArrowLeft'
      ? (activeIndex - 1 + buttons.length) % buttons.length
      : (activeIndex + 1) % buttons.length;

    const nextButton = buttons[nextIndex];
    nextButton.focus();
    nextButton.click();
  });
}

initialise();
