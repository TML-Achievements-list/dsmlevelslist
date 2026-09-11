import { store } from "../main.js";
import { embed } from "../util.js";
import { fetchPacks, fetchLevel, fetchRecords, calculatePackPoints } from "../content.js";
import { score } from "../score.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const dir = '/data';

export default {
    components: { Spinner, LevelAuthors },
    data: () => ({
        packs: [],
        list: [],
        levels: {},        // cached level data by name
        recordList: {},
        loading: true,
        selectedPack: null,
        selectedLevelObj: null, // { name, index, points, level }
        loadingPackDetails: false,
        packPointsCache: {},
        searchQuery: '',
        toggledShowcase: false,
    }),
    async mounted() {
        // Always use classic list for packs
        const classicResult = await fetch(`${dir}/_list.json`);
        let classicList;
        try {
            classicList = await classicResult.json();
        } catch (e) {
            console.error('Failed to load classic list for packs.', e);
            this.list = [];
        }
        this.list = classicList || [];

        // Load records data (kept for the app; records are hidden per request)
        this.recordList = await fetchRecords();

        this.packs = await fetchPacks();
        
        // Pre-calculate all pack points for instant display
        for (const pack of this.packs) {
            try {
                this.packPointsCache[pack.name] = await calculatePackPoints(pack.levels, this.list, this.recordList);
            } catch {
                this.packPointsCache[pack.name] = 0;
            }
        }

        this.loading = false;

        // Check for pack query param (optional)
        const queryPack = this.$route.query.pack;
        if (queryPack) {
            const pack = this.packs.find(p => p.name === queryPack);
            if (pack) {
                this.selectPack(pack);
            }
        }
    },
    computed: {
        // Levels for the selected pack (array of { name, index, points, level })
        packLevels() {
            if (!this.selectedPack) return [];
            return this.selectedPack.levels.map(name => {
                const index = this.list.indexOf(name);
                const level = this.levels[name];
                const points = level && index >= 0 ? score(index + 1, 100, level.percentToQualify) : 0;
                return {
                    name,
                    index,
                    points,
                    level,
                };
            }).filter(l => l.index >= 0).sort((a, b) => a.index - b.index);
        },
        packReward() {
            const total = this.packLevels.reduce((sum, l) => sum + l.points, 0);
            return Math.floor(total * 0.5);
        },
        filteredPacks() {
            if (!this.searchQuery) return this.packs;
            const q = this.searchQuery.toLowerCase();
            return this.packs.filter(p => p.name.toLowerCase().includes(q));
        },
        // video URL for iframe (uses embed util)
        video() {
            if (!this.selectedLevelObj || !this.selectedLevelObj.level) return '';
            const lvl = this.selectedLevelObj.level;
            const chosen = this.toggledShowcase ? (lvl.showcase || lvl.verification || lvl.video) : (lvl.verification || lvl.showcase || lvl.video);
            if (!chosen) return '';
            return embed(chosen);
        },
        showShowcaseButton() {
            return this.selectedLevelObj && this.selectedLevelObj.level && !!(this.selectedLevelObj.level.showcase);
        },
    },
    methods: {
        getPackPoints(packName) {
            return this.packPointsCache[packName] || 0;
        },

        // Parse creators string into array
        parseCreators(creatorsString) {
            if (!creatorsString || typeof creatorsString !== 'string') return [];
            return creatorsString.split(',').map(c => c.trim()).filter(c => c);
        },

        // select a pack object (lazy load individual levels into this.levels)
        async selectPack(pack) {
            this.selectedPack = pack;
            this.selectedLevelObj = null;
            this.loadingPackDetails = true;
            try {
                for (const levelName of pack.levels) {
                    if (!this.levels[levelName]) {
                        const levelData = await fetchLevel(levelName);
                        if (levelData[0]) {
                            this.levels[levelName] = levelData[0];
                        }
                    }
                }
            } finally {
                this.loadingPackDetails = false;
            }

            // Pick the level that appears earliest in the current list (lowest index).
            // Falls back to the first pack.levels entry if none of the pack levels are in the list.
            if (pack.levels && pack.levels.length > 0) {
                let bestName = null;
                let bestIdx = Infinity;

                for (const levelName of pack.levels) {
                    const idx = this.list.indexOf(levelName);
                    if (idx >= 0 && idx < bestIdx) {
                        bestIdx = idx;
                        bestName = levelName;
                    }
                }

                // fallback to first in pack array if nothing matched the list
                if (!bestName) {
                    bestName = pack.levels[0];
                }

                // pass the already-loaded level object when available to avoid refetching
                await this.selectLevel({ name: bestName, level: this.levels[bestName] });
            }
        },

        // load and display level in center (List-style), WITHOUT rendering Records
        async selectLevel(level) {
            this.selectedLevelObj = null;
            if (!level.level) {
                try {
                    const [loaded] = await fetchLevel(level.name);
                    if (loaded) {
                        this.levels[level.name] = loaded;
                        level.level = loaded;
                    }
                } catch (e) {
                    console.error('Failed to fetch level', level.name, e);
                }
            }

            const lvl = level.level || this.levels[level.name];
            if (!lvl) return;

            const index = this.list.indexOf(lvl.name);
            const points = index >= 0 ? score(index + 1, 100, lvl.percentToQualify) : 0;

            this.selectedLevelObj = {
                name: lvl.name,
                index,
                points,
                level: lvl,
            };

            this.toggledShowcase = false;
        },
    },
    template: `
        <main v-if="loading">
            <Spinner />
        </main>

        <main v-else class="page-packs">
            <!-- LEFT: Packs list -->
            <div class="packs-container">
                <h2>Packs</h2>

                <div style="padding:0 0.5rem 0.5rem;">
                    <input id="packSearch" v-model="searchQuery" placeholder="Search packs..." />
                </div>

                <div class="packs-list">
                    <div v-for="pack in filteredPacks" :key="pack.name" class="pack-item" :class="{ active: selectedPack === pack }" @click="selectPack(pack)"
                         :style="{ background: pack.gradient ? pack.gradient : (pack.color ? pack.color : 'var(--color-background)') }">
                        <!-- per-pack text color applied inline; if no textColor uses site on-background -->
                        <div class="pack-name" :style="{ color: pack.textColor ? pack.textColor : 'var(--color-on-background)' }">{{ pack.name }}</div>
                        <div class="pack-meta">
                            <span class="pack-levels-count">{{ pack.levels.length }} levels</span>
                            <span class="pack-points">{{ getPackPoints(pack.name) }} pts</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CENTER: Level details (List-style) -->
            <div class="level-container">
                <div class="level" v-if="selectedLevelObj && selectedLevelObj.level">
                    <h1>{{ selectedLevelObj.level.name }}</h1>
                    <LevelAuthors :author="selectedLevelObj.level.author" :creators="selectedLevelObj.level.creators || []" :verifier="selectedLevelObj.level.verifier"></LevelAuthors>
                    
                    <!-- Pack creator info -->
                    <div v-if="selectedPack && (selectedPack.creators || selectedPack.verifier || selectedPack.publisher)" class="pack-info">
                        <h3>Pack Info</h3>
                        <LevelAuthors 
                            :author="selectedPack.author || selectedPack.publisher || 'Unknown'"
                            :creators="parseCreators(selectedPack.creators)"
                            :verifier="selectedPack.verifier || 'Unknown'"
                        ></LevelAuthors>
                    </div>

                    <div class="video-controls">
                        <button class="video-btn" :class="{ active: !toggledShowcase }" @click="toggledShowcase = false">Verification</button>
                        <button v-if="showShowcaseButton" class="video-btn" :class="{ active: toggledShowcase }" @click="toggledShowcase = true">Showcase</button>
                    </div>

                    <iframe v-if="video" class="video" id="videoframe" :src="video" frameborder="0"></iframe>

                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ selectedLevelObj.points }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ selectedLevelObj.level.id }}</p>
                        </li>
                        <li v-if="selectedLevelObj.level.length">
                            <div class="type-title-sm">Length</div>
                            <p>{{ selectedLevelObj.level.length }}</p>
                        </li>
                    </ul>
                </div>

                <!-- Pack placeholder / no selection -->
                <div v-else class="level">
                    <div v-if="selectedPack">
                        <div v-if="loadingPackDetails" class="pack-loading"><Spinner/></div>
                        <div v-else style="color:var(--color-on-background); margin-top:12px;">Select a level on the right to view details here.</div>
                    </div>
                    <div v-else style="height: 100%; justify-content: center; align-items: center; display: flex;">
                        <p>Select a pack to view details</p>
                    </div>
                </div>
            </div>

            <!-- RIGHT: levels in pack -->
            <div class="level-container">
                <h2>Levels</h2>

                <div v-if="!packLevels || packLevels.length === 0" class="level" style="justify-content: center; align-items: center;">
                    <p>Pick a pack to see levels</p>
                </div>

                <table v-else class="list">
                    <tr v-for="level in packLevels" :key="level.name" :class="{ active: selectedLevelObj && selectedLevelObj.name === level.name }">
                        <td class="rank">
                            <p class="type-label-lg">#{{ level.index + 1 }}</p>
                        </td>
                        <td class="level" :class="{ active: selectedLevelObj && selectedLevelObj.name === level.name }">
                            <button class="level-btn" @click="selectLevel(level)">
                                <span class="type-label-lg">{{ level.name }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
        </main>
    `,
};
