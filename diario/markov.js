// https://github.com/Kawyn/markov/

/**
 * Multithreading implemetation of Markov Chain.
 */
class Markov {

    chain = {};

    #seperator; #length; threads;

    get seperator() {

        return this.#seperator;
    }

    get length() {

        return this.#length;
    }

    #workers = [];

    debug = false;

    /**
     * Creates a new Markov Chain.
     * @param {string} seperator Character or characters that separates a chain nodes.
     * @param {number} length Length of the chain.
     * @param {number} threads Number of threads.
     */
    constructor (seperator = '', length = 10, threads = 8) {

        this.#seperator = seperator;
        this.#length = Math.max(1, length);

        // Keeps threads in range <1, hardware limit>
        this.threads = Math.min(navigator.hardwareConcurrency, Math.max(1, threads));
    }

    /**
     * Train the chain with a sample. This function adds values to the existing chain.
     * @param {string} sample Training sample.
     * @param {function} onComplete This function calls it when training is complete.
     */
    train(sample, onComplete = null) {

        const input = sample.split(this.#seperator).filter(value => value);
        const batch = Math.floor(input.length / this.threads);

        // For debug purpose.
        const time = performance.now();

        if (this.debug) {

            console.log(`[MARKOV] Starting training`);
            console.log(`[MARKOV] Threads: ${this.threads}, Batch Size: ${batch}`);
        }

        // Creating blob for worker, no more crossorigin errors.
        const blob = new Blob(['(',
            function () {
                this.addEventListener('message', message => {

                    const input = message.data.input;
                    const chain = {};

                    // We are going through array.
                    for (let i = 0; i <= input.length - message.data.length; i++) {

                        let depth = 0;

                        let c = chain, w = input[i + depth];

                        // Here, we are going deeper in chain e.g. root -> 'a' -> 'b' -> 'h'.
                        while (depth !== message.data.length - 1) {

                            if (!c[w])
                                c[w] = {};

                            c = c[w];

                            depth++;

                            w = input[i + depth];
                        }

                        // Counting number of occurrences.
                        if (!c[w])
                            c[w] = 0;

                        c[w]++;
                    }

                    // Well boys. Worker is no more.
                    postMessage({ chain: chain });
                })
            }.toString()

            , ')()'], { type: "text/javascript" });

        // Creates workers for threads.
        for (let i = 0; i < this.threads; i++) {

            const worker = new Worker(URL.createObjectURL(blob));

            worker.addEventListener('message', message => {

                const subtrain = (main, sub) => {

                    // Goes throught batch chain value.
                    for (let k in sub) {

                        // Node doesn't exist in main chain -> we can take full node from batch chain.
                        if (!main[k]) {

                            main[k] = sub[k];
                        }

                        else {

                            // We cannot go deeper so we just sum the probability.
                            if (typeof main[k] === 'number')
                                main[k] += sub[k];

                            // We are going deeper!
                            else
                                subtrain(main[k], sub[k]);
                        }
                    }
                }

                subtrain(this.chain, message.data.chain);

                this.#workers.splice(this.#workers.indexOf(worker), 1);

                if (this.debug)
                    console.log(`[MARKOV] Training progress: ${(this.threads - this.#workers.length) / this.threads * 100}%`);

                if (this.#workers.length === 0) {

                    if (this.debug)
                        console.log(`[MARKOV] Training complete in ${((performance.now() - time) / 1000).toFixed(2)}s`);

                    if (typeof onComplete === 'function')
                        onComplete();
                }

                worker.terminate();

            }, false)

            worker.postMessage({
                input: input.slice(i * batch, Math.min((i + 1) * batch, input.length)),
                length: this.#length,
            });

            this.#workers.push(worker);
        }

        return this;
    }

    /**
     * Predict or Generate string using chain.
     * @param {number} length Length of prediction.
     * @param {string} start Starting value of prediction.
     * @param {number} alpha Number which determines the importance of probability. Greater values provide more importance to commoner nodes from samples.
     * @returns Newly prediction.
     */
    predict(length, { start = '', alpha = 1 } = {}) {

        // Throwing start to array.
        if (typeof start === 'string')
            start = start.split(this.#seperator);

        const result = start;

        // If start value is missing or too short, we are filling empty space with random values.
        while (result.length < this.#length - 1) {

            let c = this.chain;

            for (let w of result)
                c = c[w];

            const keys = Object.keys(c);
            result.push(keys[Math.floor(Math.random() * keys.length)]);
            length--; // also it counts to length.
        }

        try {

            for (let i = 0; i < length; i++) {

                let c = this.chain;

                // Finds right chain node.
                for (let j = 1; j < this.#length; j++)
                    c = c[result[result.length - this.#length + j]];

                // Some shenanigans with randomness or probability.
                let sum = 0;

                for (let k in c)
                    sum += c[k] * alpha;

                let target = Math.random() * sum;

                for (let k in c) {

                    target -= c[k] * alpha;

                    if (target <= 0) {

                        result.push(k);
                        break;
                    }
                }
            }
        }
        catch (error) {

            console.warn(`[MARKOV] Chain is missing connection for: "${result.slice(result.length - this.#length).join('", "')}".`);
        }

        return result.join(this.#seperator);
    }

    /**
     * Return n possible words following the given text, and its probabilities.
     * @param {string} text The text to find possible words for.
     * @param {number} n The number of words to consider.
     * @param {object} options Optional settings.
     * @param {boolean} options.randomize Whether to randomly sample results. Default: true.
     * @param {number} options.temperature Higher = more variety, lower = safer/common words. Default: 1.35.
     * @returns {Array<{word: string, probability: number}>} An array of possible words and their probabilities.
     * example: [{ word: "the", probability: 0.5 }, { word: "a", probability: 0.3 }, { word: "cat", probability: 0.2 }]
     */
    getNextPossibleWords(text, n, options = {}) {

        if (typeof text !== 'string')
            text = '';

        const limit = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 10;

        if (limit === 0)
            return [];

        const randomize = options.randomize !== false;

        const temperature = Number.isFinite(options.temperature)
            ? Math.max(0.01, options.temperature)
            : 1.35;

        const rng = typeof options.random === 'function'
            ? options.random
            : Math.random;

        const count = node => {

            if (typeof node === 'number')
                return node;

            let sum = 0;

            for (let k in node)
                sum += count(node[k]);

            return sum;
        };

        const getNode = tokens => {

            let c = this.chain;

            for (let token of tokens) {

                if (!c || typeof c === 'number' || c[token] === undefined)
                    return null;

                c = c[token];
            }

            return c && typeof c !== 'number' ? c : null;
        };

        const getNodeWithBackoff = tokens => {

            const maxContext = Math.min(tokens.length, this.#length - 1);

            for (let size = maxContext; size >= 0; size--) {

                const node = getNode(tokens.slice(tokens.length - size));

                if (node)
                    return node;
            }

            return null;
        };

        const distribution = node => {

            const possible = [];
            let total = 0;

            for (let k in node) {

                const value = count(node[k]);

                if (value > 0) {

                    possible.push({
                        token: k,
                        count: value,
                    });

                    total += value;
                }
            }

            if (total === 0)
                return [];

            return possible
                .map(value => ({
                    token: value.token,
                    probability: value.count / total,
                }))
                .sort((a, b) => b.probability - a.probability);
        };

        const weightedSampleWithoutReplacement = (items, amount, getWeight) => {

            const pool = items.map(item => {

                const probability = Math.max(0, getWeight(item));

                return {
                    item,
                    weight: Math.pow(probability, 1 / temperature),
                };
            });

            const selected = [];

            while (selected.length < amount && pool.length > 0) {

                let totalWeight = pool.reduce((sum, value) => sum + value.weight, 0);

                if (totalWeight <= 0) {

                    const index = Math.floor(rng() * pool.length);
                    selected.push(pool[index].item);
                    pool.splice(index, 1);
                    continue;
                }

                let random = Math.min(Math.max(rng(), 0), 0.999999999999) * totalWeight;
                let selectedIndex = pool.length - 1;

                for (let i = 0; i < pool.length; i++) {

                    random -= pool[i].weight;

                    if (random <= 0) {

                        selectedIndex = i;
                        break;
                    }
                }

                selected.push(pool[selectedIndex].item);
                pool.splice(selectedIndex, 1);
            }

            return selected;
        };

        const chooseResults = items => {

            if (!randomize) {

                return items
                    .sort((a, b) => b.probability - a.probability)
                    .slice(0, limit);
            }

            return weightedSampleWithoutReplacement(
                items,
                Math.min(limit, items.length),
                item => item.probability
            );
        };

        /*
        * Word-token chain.
        *
        * Example:
        * const markov = new Markov(' ', 3);
        *
        * In this case, each chain token is already a full word.
        */
        if (this.#seperator !== '') {

            const input = text.split(this.#seperator).filter(value => value);
            const context = input.slice(Math.max(0, input.length - this.#length + 1));
            const node = getNodeWithBackoff(context);

            if (!node)
                return [];

            return chooseResults(distribution(node))
                .map(value => ({
                    word: value.token,
                    probability: value.probability,
                }));
        }

        /*
        * Character-token chain.
        *
        * Default Markov uses separator '', so the chain predicts characters.
        * This section walks the character chain until it forms full words,
        * then randomly samples those words.
        */
        const isBoundary = value => /\s/.test(value);
        const contextLength = Math.max(0, this.#length - 1);
        const startContext = text.split('').slice(-contextLength);
        const results = new Map();

        const addResult = (word, probability) => {

            if (!word)
                return;

            results.set(word, (results.get(word) || 0) + probability);
        };

        const requested = Math.max(1, limit);

        const maxGeneratedCharacters = Number.isFinite(options.maxGeneratedCharacters)
            ? Math.max(1, Math.floor(options.maxGeneratedCharacters))
            : Math.max(60, this.#length * 6);

        const maxWordLength = Number.isFinite(options.maxWordLength)
            ? Math.max(1, Math.floor(options.maxWordLength))
            : 40;

        const beamWidth = Number.isFinite(options.beamWidth)
            ? Math.max(1, Math.floor(options.beamWidth))
            : Math.max(200, requested * 70);

        const branchLimit = Number.isFinite(options.branchLimit)
            ? Math.max(1, Math.floor(options.branchLimit))
            : Math.max(25, requested * 12);

        const chooseBranches = items => {

            if (!randomize)
                return items.slice(0, branchLimit);

            return weightedSampleWithoutReplacement(
                items,
                Math.min(branchLimit, items.length),
                item => item.probability
            );
        };

        const pruneStates = states => {

            const sorted = states.sort((a, b) => b.probability - a.probability);

            if (!randomize || sorted.length <= beamWidth)
                return sorted.slice(0, beamWidth);

            const eliteCount = Math.max(1, Math.floor(beamWidth * 0.25));
            const elite = sorted.slice(0, eliteCount);
            const rest = sorted.slice(eliteCount);

            return elite.concat(
                weightedSampleWithoutReplacement(
                    rest,
                    beamWidth - elite.length,
                    state => state.probability
                )
            );
        };

        let states = [{
            context: startContext,
            word: '',
            probability: 1,
            collectingWord: false,

            // If the input ends in the middle of a word, finish that word first,
            // then collect the following word.
            waitingForNextWord: text.length > 0 && !/\s$/.test(text),
        }];

        for (let depth = 0; depth < maxGeneratedCharacters && states.length > 0; depth++) {

            const nextStates = [];

            for (let state of states) {

                const node = getNodeWithBackoff(state.context);

                if (!node)
                    continue;

                const options = chooseBranches(distribution(node));

                for (let option of options) {

                    const character = option.token;
                    const probability = state.probability * option.probability;

                    const context = contextLength === 0
                        ? []
                        : state.context.concat(character).slice(-contextLength);

                    if (state.waitingForNextWord) {

                        nextStates.push({
                            context,
                            word: '',
                            probability,
                            collectingWord: false,
                            waitingForNextWord: !isBoundary(character),
                        });

                        continue;
                    }

                    if (!state.collectingWord) {

                        if (isBoundary(character)) {

                            nextStates.push({
                                context,
                                word: '',
                                probability,
                                collectingWord: false,
                                waitingForNextWord: false,
                            });
                        }
                        else {

                            nextStates.push({
                                context,
                                word: character,
                                probability,
                                collectingWord: true,
                                waitingForNextWord: false,
                            });
                        }

                        continue;
                    }

                    if (isBoundary(character)) {

                        addResult(state.word, probability);
                    }
                    else if (state.word.length < maxWordLength) {

                        nextStates.push({
                            context,
                            word: state.word + character,
                            probability,
                            collectingWord: true,
                            waitingForNextWord: false,
                        });
                    }
                    else {

                        addResult(state.word, probability);
                    }
                }
            }

            states = pruneStates(nextStates);
        }

        for (let state of states) {

            if (state.collectingWord)
                addResult(state.word, state.probability);
        }

        const total = Array.from(results.values())
            .reduce((sum, value) => sum + value, 0);

        if (total === 0)
            return [];

        const normalizedResults = Array.from(results.entries())
            .map(([word, probability]) => ({
                word,
                probability: probability / total,
            }))
            .sort((a, b) => b.probability - a.probability);

        return chooseResults(normalizedResults);
    }
    /**
     * Clears existing chains to start anew.
     */
    clear() {

        this.chain = {};

        return this;
    }
}