import { fetchList, fetchLevel } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl, shuffle } from '../util.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';

export default {
    components: { Spinner, Btn },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roulette">
            <div class="sidebar">
                <p class="type-label-md" style="color: #aaa">
                    Shameless copy of the Extreme Demon Roulette by <a href="https://matcool.github.io/extreme-demon-roulette/" target="_blank">matcool</a>.
                </p>
                <form class="options">
                    <div class="check">
                        <input type="checkbox" id="top150" @change="onRangeChange('top150')" :checked="selectedRanges.top150">
                        <label for="top150">Top 150</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="top300" @change="onRangeChange('top300')" :checked="selectedRanges.top300">
                        <label for="top300">Top 300</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="top500" @change="onRangeChange('top500')" :checked="selectedRanges.top500">
                        <label for="top500">Top 500</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="top1000" @change="onRangeChange('top1000')" :checked="selectedRanges.top1000">
                        <label for="top1000">Top 1000</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="top1500" @change="onRangeChange('top1500')" :checked="selectedRanges.top1500">
                        <label for="top1500">Top 1500</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="top2000" @change="onRangeChange('top2000')" :checked="selectedRanges.top2000">
                        <label for="top2000">Top 2000</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="top3000" @change="onRangeChange('top3000')" :checked="selectedRanges.top3000">
                        <label for="top3000">Top 3000</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="everything" @change="onRangeChange('everything')" :checked="selectedRanges.everything">
                        <label for="everything">Everything</label>
                    </div>
                    <div class="custom-range">
                        <p class="type-label-md">Custom Range</p>
                        <div class="range-inputs">
                            <input type="number" v-model.number="customRangeStart" placeholder="From" min="1">
                            <span>-</span>
                            <input type="number" v-model.number="customRangeEnd" placeholder="To" min="1">
                        </div>
                    </div>
                    <Btn @click.native.prevent="onStart">{{ levels.length === 0 ? 'Start' : 'Restart'}}</Btn>
                </form>
                <p class="type-label-md" style="color: #aaa">
                    The roulette saves automatically.
                </p>
                <form class="save">
                    <p>Manual Load/Save</p>
                    <div class="btns">
                        <Btn @click.native.prevent="onImport">Import</Btn>
                        <Btn :disabled="!isActive" @click.native.prevent="onExport">Export</Btn>
                    </div>
                </form>
            </div>
            <section class="levels-container">
                <div class="levels">
                    <template v-if="levels.length > 0">
                        <!-- Completed Levels -->
                        <div class="level" v-for="(level, i) in levels.slice(0, progression.length)">
                            <a :href="level.video" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="">
                            </a>
                            <div class="meta">
                                <p>#{{ level.rank }}</p>
                                <h2>{{ level.name }}</h2>
                                <p style="color: #00b54b; font-weight: 700">{{ progression[i] }}%</p>
                            </div>
                        </div>
                        <!-- Current Level -->
                        <div class="level" v-if="!hasCompleted">
                            <a :href="currentLevel.video" target="_blank" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(currentLevel.video))" alt="">
                            </a>
                            <div class="meta">
                                <p>#{{ currentLevel.rank }}</p>
                                <h2>{{ currentLevel.name }}</h2>
                                <p>{{ currentLevel.id }}</p>
                            </div>
                            <form class="actions" v-if="!givenUp">
                                <input type="number" v-model="percentage" :placeholder="placeholder" :min="currentPercentage + 1" max=100>
                                <Btn @click.native.prevent="onDone">Done</Btn>
                                <Btn @click.native.prevent="onGiveUp" style="background-color: #e91e63;">Give Up</Btn>
                            </form>
                        </div>
                        <!-- Results -->
                        <div v-if="givenUp || hasCompleted" class="results">
                            <h1>Results</h1>
                            <p>Number of levels: {{ progression.length }}</p>
                            <p>Highest percent: {{ currentPercentage }}%</p>
                            <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.native.prevent="showRemaining = true">Show remaining levels</Btn>
                        </div>
                        <!-- Remaining Levels -->
                        <template v-if="givenUp && showRemaining">
                            <div class="level" v-for="(level, i) in levels.slice(progression.length + 1, levels.length - currentPercentage + progression.length)">
                                <a :href="level.video" target="_blank" class="video">
                                    <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="">
                                </a>
                                <div class="meta">
                                    <p>#{{ level.rank }}</p>
                                    <h2>{{ level.name }}</h2>
                                    <p style="color: #d50000; font-weight: 700">{{ currentPercentage + 2 + i }}%</p>
                                </div>
                            </div>
                        </template>
                    </template>
                </div>
            </section>
            <div class="toasts-container">
                <div class="toasts">
                    <div v-for="toast in toasts" class="toast">
                        <p>{{ toast }}</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        loading: false,
        levels: [],
        progression: [], // list of percentages completed
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        selectedRanges: {
            top150: false,
            top300: false,
            top500: false,
            top1000: false,
            top1500: false,
            top2000: false,
            top3000: false,
            everything: false,
        },
        rangeOrder: ['top150', 'top300', 'top500', 'top1000', 'top1500', 'top2000', 'top3000', 'everything'],
        customRangeStart: null,
        customRangeEnd: null,
        toasts: [],
        fileInput: undefined,
    }),
    async mounted() {
        // Create File Input
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        // Load progress from local storage
        const roulette = JSON.parse(localStorage.getItem('roulette'));

        if (!roulette) {
            return;
        }
        this.levels = roulette.levels;
        this.progression = roulette.progression;
    },
    computed: {
        currentLevel() {
            return this.levels[this.progression.length];
        },
        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },
        placeholder() {
            return `At least ${this.currentPercentage + 1}%`;
        },
        hasCompleted() {
            return (
                this.progression[this.progression.length - 1] >= 100 ||
                this.progression.length === this.levels.length
            );
        },
        isActive() {
            return (
                this.progression.length > 0 &&
                !this.givenUp &&
                !this.hasCompleted
            );
        },
    },
    methods: {
        shuffle,
        getThumbnailFromId,
        getYoutubeIdFromUrl,
        onRangeChange(rangeKey) {
            const index = this.rangeOrder.indexOf(rangeKey);
            const newState = !this.selectedRanges[rangeKey];

            if (newState) {
                // When ticking a box: tick all boxes above it
                for (let i = 0; i <= index; i++) {
                    this.selectedRanges[this.rangeOrder[i]] = true;
                }
            } else {
                // When unticking a box: untick all boxes below it
                for (let i = index; i < this.rangeOrder.length; i++) {
                    this.selectedRanges[this.rangeOrder[i]] = false;
                }
            }
        },
        getRangeIndices(rangeKey) {
            const ranges = {
                top150: [0, 150],
                top300: [0, 300],
                top500: [0, 500],
                top1000: [0, 1000],
                top1500: [0, 1500],
                top2000: [0, 2000],
                top3000: [0, 3000],
                everything: [0, 10000],
            };
            return ranges[rangeKey] || [0, 0];
        },
        async onStart() {
            if (this.isActive) {
                this.showToast('Give up before starting a new roulette.');
                return;
            }

            const hasSelectedRange = Object.values(this.selectedRanges).some(v => v) || 
                                     (this.customRangeStart !== null && this.customRangeEnd !== null);
            
            if (!hasSelectedRange) {
                this.showToast('Please select at least one range.');
                return;
            }

            this.loading = true;

            const tlist = await fetchList();
            if (!tlist) {
                this.loading = false;
                this.showToast(
                    'List is currently broken. Wait until it\'s fixed to start a roulette.',
                );
                return;
            }

            const tlistMapped = tlist.map((lvl, i) => ({
                rank: i + 1,
                // id: lvl.id,
                name: lvl,
                // video: lvl.verification,
            }));
            
            const list = [];
            
            // Add selected preset ranges
            for (const [rangeKey, isSelected] of Object.entries(this.selectedRanges)) {
                if (isSelected) {
                    const [start, end] = this.getRangeIndices(rangeKey);
                    list.push(...tlistMapped.slice(start, end));
                }
            }
            
            // Add custom range
            if (this.customRangeStart !== null && this.customRangeEnd !== null) {
                const start = Math.max(0, this.customRangeStart - 1); // Convert to 0-indexed
                const end = Math.min(tlistMapped.length, this.customRangeEnd);
                if (start < end) {
                    list.push(...tlistMapped.slice(start, end));
                }
            }

            // Remove duplicates
            const uniqueList = Array.from(new Map(list.map(item => [item.rank, item])).values());

            // random 100 levels
            const _levels = shuffle(uniqueList).slice(0, 100);
            const fullList = await Promise.all(
                _levels.map(async (path, rank) => {
                    const levelResult = await fetch(`../data/${path.name}.json`);
                    const name = path.name
                    try {
                        const level = await levelResult.json();
                        return [
                            {
                                ...level,
                                name,
                                records: level.records.sort(
                                    (a, b) => b.percent - a.percent,
                                ),
                            },
                            null,
                        ];
                    } catch {
                        console.error(`Failed to load level #${rank + 1} ${name}.`);
                        return [null, path];
                    }
                }),
            );

            const fullListMapped = fullList.map((lvl, i) => ({
                rank: i + 1,
                id: lvl[0].id,
                name: lvl[0].name,
                video: lvl[0].verification,
            }));

            this.levels = fullListMapped

            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;

            this.loading = false;
        },
        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                }),
            );
        },
        onDone() {
            if (!this.percentage) {
                return;
            }

            if (
                this.percentage <= this.currentPercentage ||
                this.percentage > 100
            ) {
                this.showToast('Invalid percentage.');
                return;
            }
            
            this.progression.push(this.percentage);
            this.percentage = undefined;

            this.save();
        },
        onGiveUp() {
            this.givenUp = true;

            // Save progress
            localStorage.removeItem('roulette');
        },
        onImport() {
            if (
                this.isActive &&
                !window.confirm('This will overwrite the currently running roulette. Continue?')
            ) {
                return;
            }

            this.fileInput.showPicker();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;

            const file = this.fileInput.files[0];

            if (file.type !== 'application/json') {
                this.showToast('Invalid file.');
                return;
            }

            try {
                const roulette = JSON.parse(await file.text());

                if (!roulette.levels || !roulette.progression) {
                    this.showToast('Invalid file.');
                    return;
                }

                this.levels = roulette.levels;
                this.progression = roulette.progression;
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
                this.percentage = undefined;
            } catch {
                this.showToast('Invalid file.');
                return;
            }
        },
        onExport() {
            const file = new Blob(
                [JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                })],
                { type: 'application/json' },
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = 'edi_roulette';
            a.click();
            URL.revokeObjectURL(a.href);
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => {
                this.toasts.shift();
            }, 3000);
        },
    },
};
