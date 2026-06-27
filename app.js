import Model from './movieList/model.js';
import View from './movieList/view.js';
import Controller from './movieList/controller.js';

// 當網頁 DOM 完全載入後再初始化 App
document.addEventListener('DOMContentLoaded', () => {
    const app = new Controller(new Model(), new View());
});