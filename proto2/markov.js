// Builds a Markov chain from a local text file. This work initially started
// after reviewing Jason Bury's article "Using Javascript and Markov Chains to Generate Text" available at 
// http://www.soliantconsulting.com/blog/2013/02/draft-title-generator-using-markov-chains. Although little
// of that work remains (array randomizer is about it), his work inspired me to create this, so shout out
// to him. Other functions are used with permission and credited where due.
// All other work is (c) Matthew Martin (The Usual Dosage) December 2013.

$(function () {

    // Sentences should not end with these. Use these to further refine the Markov chain.
    var end_noise_words = ["for", "and", "nor", "or", "but", "the", "an", "a", "be", "i",
        "y", "o", "en", "pero", "para", "con", "de", "la", "que", "el", "un", "ser", "yo"];

    // Characters that will be removed from tokenized words. Allow Unicode
    // letters and numbers plus common punctuation so generated text can
    // retain accents, non-ASCII letters, commas, apostrophes, etc.
    var regex = /[^\p{L}\p{N}'’\-\.\,\?\!\:\;\(\) ]+/gu;

    var chain = {};
    var chain_keys = [];
    var source_loaded = false;

    // Array choice randomizer.
    Array.prototype.random = function () {
        var i = Math.floor(this.length * Math.random());
        return this[i];
    };

    function normalize_text(text) {
        return $.trim(text.replace(regex, ' ')).replace(/\s+/g, ' ');
    }

    function tokenize_text(text) {
        var normalized = normalize_text(text).toLowerCase();

        if (!normalized) {
            return [];
        }

        return normalized.split(' ');
    }

    function build_chain(text) {
        var words = tokenize_text(text);

        chain = {};
        chain_keys = [];

        for (var i = 0; i < words.length - 2; i++) {
            var key_pair = words[i] + ' ' + words[i + 1];
            var value = words[i + 2];

            if (!chain[key_pair]) {
                chain[key_pair] = [];
                chain_keys.push(key_pair);
            }

            if ($.inArray(value, chain[key_pair]) === -1) {
                chain[key_pair].push(value);
            }
        }
    }

    function choose_random_key() {
        if (chain_keys.length === 0) {
            return null;
        }

        return chain_keys[Math.floor(chain_keys.length * Math.random())];
    }

    function capitalize_first_word(word) {
        // If the word (stripped of surrounding punctuation) is 'i', capitalize it.
        var stripped = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
        if (stripped.toLowerCase() === 'i') {
            // Replace lone 'i' occurrences while preserving surrounding punctuation.
            return word.replace(/\bi\b/iu, 'I');
        }

        // Capitalize the first alphabetic (Unicode) character, preserving leading punctuation.
        for (var i = 0; i < word.length; i++) {
            var ch = word.charAt(i);
            if (/\p{L}/u.test(ch)) {
                return word.slice(0, i) + ch.toUpperCase() + word.slice(i + 1);
            }
        }

        return word;
    }

    function strip_word_for_check(word) {
        return word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').toLowerCase();
    }

    function find_seed(prompt_words) {
        var prompt_key;

        if (prompt_words.length >= 2) {
            prompt_key = prompt_words[prompt_words.length - 2] + ' ' + prompt_words[prompt_words.length - 1];

            if (chain[prompt_key]) {
                return prompt_key;
            }
        }

        if (prompt_words.length === 1) {
            for (var i = 0; i < chain_keys.length; i++) {
                if (chain_keys[i].indexOf(prompt_words[0] + ' ') === 0) {
                    return chain_keys[i];
                }
            }
        }

        return choose_random_key();
    }

    function generate_sentence(min_length, prompt_text, exact_length) {
        var prompt_words = tokenize_text(prompt_text);
        var initial_seed = find_seed(prompt_words);
        var sentence;
        var current_key;

        if (!initial_seed) {
            return 'Load a text file to generate a title.';
        }

        // If an exact length is requested, try several times to build a sentence
        // that trims to exactly that many words (after removing end-noise words).
        if (exact_length && exact_length > 0) {
            var maxAttempts = 20;

            for (var attempt = 0; attempt < maxAttempts; attempt++) {
                var seed_key = (attempt === 0) ? initial_seed : choose_random_key();

                if (!seed_key) {
                    break;
                }

                if (prompt_words.length >= 2 && chain[prompt_words[prompt_words.length - 2] + ' ' + prompt_words[prompt_words.length - 1]]) {
                    sentence = prompt_words.slice(0);
                }
                else if (prompt_words.length === 1 && seed_key.indexOf(prompt_words[0] + ' ') === 0) {
                    sentence = [prompt_words[0], seed_key.split(' ')[1]];
                }
                else {
                    sentence = seed_key.split(' ');
                }

                // If seed already exceeds requested length, try another seed
                if (sentence.length > exact_length) {
                    continue;
                }

                current_key = sentence.slice(sentence.length - 2).join(' ');

                while (sentence.length < exact_length) {
                    var options = chain[current_key];

                    if (!options || options.length === 0) {
                        break;
                    }

                    sentence.push(options.random());
                    current_key = sentence.slice(sentence.length - 2).join(' ');
                }

                while (sentence.length > 0 && $.inArray(strip_word_for_check(sentence[sentence.length - 1]), end_noise_words) > -1) {
                    sentence.pop();
                }

                if (sentence.length === exact_length) {
                    sentence[0] = capitalize_first_word(sentence[0]);
                    var outExact = sentence.join(' ');
                    if (/[.!?]$/.test(outExact)) {
                        return outExact;
                    }

                    return outExact + '.';
                }
            }

            // If we couldn't produce an exact-length sentence, fall back to the
            // default min-length behavior below.
        }

        // Default behavior: generate a sentence of at least `min_length` words.
        var seed_key = initial_seed;

        if (prompt_words.length >= 2 && chain[prompt_words[prompt_words.length - 2] + ' ' + prompt_words[prompt_words.length - 1]]) {
            sentence = prompt_words.slice(0);
        }
        else if (prompt_words.length === 1 && seed_key.indexOf(prompt_words[0] + ' ') === 0) {
            sentence = [prompt_words[0], seed_key.split(' ')[1]];
        }
        else {
            sentence = seed_key.split(' ');
        }

        current_key = sentence.slice(sentence.length - 2).join(' ');

        while (sentence.length < min_length + 2) {
            var options = chain[current_key];

            if (!options || options.length === 0) {
                break;
            }

            sentence.push(options.random());
            current_key = sentence.slice(sentence.length - 2).join(' ');
        }

        while (sentence.length > 0 && $.inArray(strip_word_for_check(sentence[sentence.length - 1]), end_noise_words) > -1) {
            sentence.pop();
        }

        if (sentence.length === 0) {
            return 'Load a text file to generate a title.';
        }

        sentence[0] = capitalize_first_word(sentence[0]);

        var out = sentence.join(' ');
        // If sentence already ends with terminal punctuation, keep it.
        if (/[.!?]$/.test(out)) {
            return out;
        }

        return out + '.';
    }

    function render_sentence() {
        if (!source_loaded) {
            $('#generated_title').html("<span class='quote'>&ldquo;</span>Load a text file to generate a title.<span class='quote'>&rdquo;</span>");
            return;
        }
        var requestedCount = parseInt($('#word_count').val(), 10);
        var exact = (requestedCount && requestedCount > 0) ? requestedCount : undefined;

        var title = generate_sentence(10 + Math.floor(3 * Math.random()), $('#prompt_box').val(), exact);
        $('#generated_title').html("<span class='quote'>&ldquo;</span>" + title + "<span class='quote'>&rdquo;</span>");
    }

    function load_text(text, source_name) {
        build_chain(text);
        source_loaded = chain_keys.length > 0;

        if (source_loaded) {
            $('#source_status').text('Loaded ' + source_name + '.');
            render_sentence();
        }
        else {
            $('#source_status').text('The selected text did not contain enough words to build a chain.');
            $('#generated_title').html("<span class='quote'>&ldquo;</span>The selected text did not contain enough words to build a chain.<span class='quote'>&rdquo;</span>");
        }
    }

    $('#generate').on('click', function () {
        render_sentence();
    });

    $('#txt_file').on('change', function (event) {
        var file = event.target.files && event.target.files[0];

        if (!file) {
            return;
        }

        var reader = new FileReader();

        reader.onload = function (load_event) {
            load_text(load_event.target.result, file.name);
        };

        reader.readAsText(file);
    });

    $('#prompt_box').on('input', function () {
        if (source_loaded) {
            render_sentence();
        }
    });

    $.ajax({
        url: 'HitchHiker1.txt',
        dataType: 'text',
        cache: false,
        success: function (text) {
            load_text(text, 'HitchHiker1.txt');
        },
        error: function () {
            source_loaded = false;
            $('#source_status').text('Choose a local .txt file to build the chain.');
            $('#generated_title').html("<span class='quote'>&ldquo;</span>Choose a local .txt file to build the chain.<span class='quote'>&rdquo;</span>");
        }
    });
});
