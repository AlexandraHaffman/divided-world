/* ЗАГЛУШКА ТОЛЬКО ДЛЯ ЭТОГО ПРЕВЬЮ.
   В реальном репозитории уже есть настоящий carousel-mode.js — его не трогаем,
   просто подключаем compare-mode.js рядом с ним. */
function activateCarouselMode() {
  document.getElementById("grid").innerHTML =
    '<div class="empty-state">Режим "по 1" в этом превью не подключён — тестируем только сравнение (3 колонки).<br><br>Переключись на 3 ↑</div>';
}
function deactivateCarouselMode() {}
