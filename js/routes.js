import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Packs from './pages/Packs.js';
import Roulette from './pages/Roulette.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/packs', component: Packs },
    { path: '/roulette', component: Roulette },
];
