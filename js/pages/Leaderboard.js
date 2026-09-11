import { fetchLeaderboard, fetchWorldRecords, discoverWorldRecordPlayers } from '../content.js';
import { localize } from '../util.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        err: [],
        searchQuery: '',
        playerWorldRecords: {},
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <!-- SEARCH BOX: inserted here (above the leaderboard) -->
                    <div id="player-search-wrapper" style="padding:16px; margin-bottom:8px;">
                      <input
                        id="playerSearch"
                        v-model="searchQuery"
                        type="search"
                        placeholder="Search players..."
                        aria-label="Search players"
                        autocomplete="off"
                        style="width:100%; padding:10px 12px; border-radius:8px; border:none; background:#2a2a2a; color:#fff; box-sizing:border-box; font-family: 'Lexend Deca', sans-serif; font-weight: 500;"
                      />
                    </div>

                    <table class="board">
                        <tr v-for="(ientry, i) in filteredLeaderboard" :key="ientry.user">
                            <td class="rank">
                                <p class="type-label-lg">#{{ leaderboard.indexOf(ientry) + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': leaderboard[selected].user === ientry.user }">
                                <button @click="selected = leaderboard.indexOf(ientry)">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <div class="player">
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ entry.total }}</h3>
                        <div v-if="entry.completedPacks && entry.completedPacks.length > 0" class="completed-packs">
                            <h4>Completed Packs</h4>
                            <ul>
                                <li v-for="pack in entry.completedPacks" :key="pack.name" :style="{ backgroundColor: pack.color, color: '#fff' }">
                                    {{ pack.name }}
                                </li>
                            </ul>
                        </div>
                        <h2 v-if="entry.worldRecords && entry.worldRecords.length > 0">World Records ({{ entry.worldRecords.length }})</h2>
                        <table class="table" v-if="entry.worldRecords && entry.worldRecords.length > 0">
                            <tr v-for="wr in entry.worldRecords" :key="wr.level">
                                <td class="rank"><p></p></td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="wr.link">{{ wr.level }} {{ wr.wr }}</a>
                                </td>
                                <td class="score"><p></p></td>
                            </tr>
                        </table>
                        <h2 v-if="entry.upcomingVerifying && entry.upcomingVerifying.length > 0">Upcoming Verifications ({{ entry.upcomingVerifying.length }})</h2>
                        <table class="table" v-if="entry.upcomingVerifying && entry.upcomingVerifying.length > 0">
                            <tr v-for="verification in entry.upcomingVerifying" :key="verification.level">
                                <td class="rank"><p></p></td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="verification.link">{{ verification.level }}</a>
                                </td>
                                <td class="score"><p></p></td>
                            </tr>
                        </table>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified" :key="score.level">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed" :key="score.level">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed" :key="score.level">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            const player = this.leaderboard[this.selected];
            if (!player) return {};
            return {
                ...player,
                worldRecords: this.playerWorldRecords[player.user] || []
            };
        },
        filteredLeaderboard() {
            const q = (this.searchQuery || '').toLowerCase().trim();
            if (!q) return this.leaderboard;
            return this.leaderboard.filter(entry => {
                if (!entry.user) return false;
                return entry.user.toLowerCase().includes(q);
            });
        },
    },
    async mounted() {
        console.log('Leaderboard mounted');
        const [leaderboard, err] = await fetchLeaderboard();
        console.log('Leaderboard data loaded, count:', leaderboard.length);
        this.leaderboard = leaderboard;
        this.err = err;
        this.loading = false;
        
        console.log('Loading all world records in background');
        this.preloadAllWorldRecords();
        
        console.log('Starting background WR player discovery');
        this.loadWorldRecordPlayersInBackground();
    },
    methods: {
        localize,
        async preloadAllWorldRecords() {
            try {
                const worldRecordsMap = await fetchWorldRecords();
                this.playerWorldRecords = worldRecordsMap;
                console.log('Preloaded world records for all players');
            } catch (e) {
                console.error('Error preloading world records:', e);
            }
        },
        async loadWorldRecordPlayersInBackground() {
            try {
                const newPlayers = await discoverWorldRecordPlayers(this.leaderboard);
                console.log('Found new WR players:', newPlayers.length);
                if (newPlayers.length > 0) {
                    this.leaderboard = [...this.leaderboard, ...newPlayers].sort((a, b) => b.total - a.total);
                    console.log('Updated leaderboard with WR players, new count:', this.leaderboard.length);
                }
            } catch (e) {
                console.error('Error discovering WR players:', e);
            }
        },
    },
};
