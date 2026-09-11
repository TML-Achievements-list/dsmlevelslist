import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');

// Mobile scrollbar functionality
document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.querySelector('.list-container');
    if (!listContainer) return;

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    listContainer.addEventListener('touchstart', (e) => {
        // Check if touch is in the scrollbar area (right 30px)
        const touch = e.touches[0];
        const rect = listContainer.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        
        if (touchX > rect.width - 30) {
            isDragging = true;
            startY = touch.clientY;
            startScrollTop = listContainer.scrollTop;
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length > 0) {
            const touch = e.touches[0];
            const diff = touch.clientY - startY;
            const scrollRatio = (listContainer.scrollHeight - listContainer.clientHeight) / listContainer.clientHeight;
            listContainer.scrollTop = startScrollTop - (diff * scrollRatio);
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });
});
