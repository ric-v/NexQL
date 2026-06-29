function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName('pg-tab-panel');
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.remove('active');
    tabcontent[i].style.display = 'none';
  }
  const tablinks = document.getElementsByClassName('pg-tab-btn');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }
  const panel = document.getElementById(tabName);
  if (panel) {
    panel.style.display = 'block';
    panel.classList.add('active');
  }
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  }
}

// Activate first tab panel on load
document.addEventListener('DOMContentLoaded', () => {
  const firstPanel = document.querySelector('.pg-tab-panel');
  if (firstPanel) {
    firstPanel.style.display = 'block';
    firstPanel.classList.add('active');
  }
});
