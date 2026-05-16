const corpus = 'corpus/pokemon-rojo.txt';
let prefix = `Ruta ${Math.random().toString()[2]} `;
const markov = new Markov('', prefix.length-1);
markov.debug = false;
let generationInterval = null;
let trained = false;

async function loadCorpus() {
    console.log('Loading corpus...');
    return fetch(corpus).then(response => {
        response.text().then(text => {
            markov.train(text, () => {
                trained = true;
                console.log('Corpus trained');
            });
        }); 
    });
}

// function generateText() {
//     document.querySelector('#content').innerHTML = '';
//     let prediction = markov.predict(700, { start: prefix, alpha: 1 });
//     animateText(prediction, 500, document.querySelector('#content'), () => {
//         // document.querySelector('#content').innerHTML += '...';
//     });
// }



function getNextPossibleWords(n) {
    const lastNWords = document.querySelector('#content').textContent.trim();
    return markov.getNextPossibleWords(lastNWords, n);
}


function animateText(text, delay = 100, element = document.querySelector('div'), callback = null) {
    generationInterval && clearInterval(generationInterval);
    let words = text.split(' ');
    let index = 0;
    generationInterval = setInterval(() => {
        if (index < words.length) {
            // element.textContent += words[index] + ' ';
            element.innerHTML = words.slice(0, index).join(' ');
            element.innerHTML += ' <span class="fade-in-text">' + words[index] + '</span>';
            index++;
        } else {
            clearInterval(generationInterval);
            callback && callback();
        }
    }, delay);
}


// replaces keywords with an <input><options> element calculated by the markov chain, which shows the next possible words according to the previous words in the text 
// keywords is an array of objects with the following structure: { word: 'word', shift: 0 }
//     shift value allows to replace the next or previous word instead of the current one. 0 = current word, -1 = previous word, 1 = next word, etc.
function replaceKeyWithPossibility(keywords = [], text, callback = null) {
    // If text not provided, read from #content
    if (typeof text !== 'string') {
        const el = document.querySelector('#content') || document.querySelector('div');
        text = el ? el.textContent.trim() : '';
    }

    const words = text.length ? text.split(' ') : [];
    // Normalize keywords to objects: { word, shift }
    const kwObjs = (keywords || []).map(k => (typeof k === 'string') ? { word: k, shift: 0 } : { word: k.word, shift: k.shift || 0 });

    const replacements = {};

    for (let i = 0; i < words.length; i++) {
        const w = words[i].trim();
        const found = kwObjs.find(k => (k.word || '').toUpperCase() === w.toUpperCase());
        if (!found) continue;

        const targetIdx = i + (found.shift || 0);
        if (targetIdx < 0 || targetIdx >= words.length) continue;

        const prevWords = words.slice(0, targetIdx).join(' ').trim();
        let options = (markov.getNextPossibleWords(prevWords, 5) || []).slice();

        // normalize options to string words
        options = options.map(o => (typeof o === 'string') ? o : o.word);
        // remove the current target word from suggestions
        options = options.filter(opt => opt !== words[targetIdx].trim());

        const select = document.createElement('select');
        select.addEventListener('change', (e) => { callback && callback(e); });

        options.forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt;
            optionElement.textContent = opt;
            select.appendChild(optionElement);
        });

        // ensure at least the original word is present
        if (select.options.length === 0) {
            const optionElement = document.createElement('option');
            optionElement.value = words[targetIdx];
            optionElement.textContent = words[targetIdx];
            select.appendChild(optionElement);
        }

        replacements[targetIdx] = select.outerHTML;
    }

    // Build output string, replacing targeted words with the select HTML
    const out = words.map((w, idx) => replacements.hasOwnProperty(idx) ? replacements[idx] : w).join(' ');
    return out;
}



function gentext(prompt) {
    prefix = `Ruta ${Math.random().toString()[2]} `;
    let prediction = '';

    return fetch(corpus)
        .then(response => response.text())
        .then(text => new Promise((resolve) => {
            console.log('Training Markov model...');
            markov.train(text, resolve);
        }))
        .then(() => {
            console.log('Generating text...');
            prediction = markov.predict(500, { start: prefix, alpha: 1 });
            prediction = trimLastSentence(prediction);
            if (prediction.length < 20) {
                prediction += ' ' + markov.predict(200, { start: prediction, alpha: 1 });
            }
            document.querySelector('#content').textContent = prediction;

            console.log('Replacing keywords with possibilities...');
            const keywords = [{word:'Pikachu', shift: 0}, {word:'Bulbasaur', shift:0}, {word:'Charmander', shift: 0}, {word:'Squirtle', shift: 0},
                 {word:'Pueblo', shift: 1}, {word:'Ciudad', shift: 1}, {word:'Gimnasio', shift: 1}, {word:'Gimnasio', shift: 1}, 
                 {word:'vuelve', shift: 1},
                 {word:'Norte', shift: 1}, {word:'Sur', shift: 1}, {word:'Este', shift: 1}, {word:'Oeste', shift: 1},
                 {word:'norte', shift: 1}, {word:'sur', shift: 1}, {word:'este', shift: 1}, {word:'oeste', shift: 1},
                 {word:'tierra', shift: 1}, {word:'agua', shift: 1}, {word:'fuego', shift: 1}, {word:'eléctrico', shift: 1},
                 {word:'hierba', shift: 1}, {word:'veneno', shift: 1}, {word:'volador', shift: 1}, {word:'bicho', shift: 1},
                 {word:'roca', shift: 1}, {word:'fantasma', shift: 1}, {word:'dragón', shift: 1}, {word:'siniestro', shift: 1},
                 {word:'derecha', shift: 1}, {word:'izquierda', shift: 1}, {word:'arriba', shift: 1}, {word:'abajo', shift: 1},
                 {word:'tipo', shift: 1}, {word:'Tipo', shift:1}, {word:'Profesor', shift: 1}, {word:'Equipo', shift: 1}, {word:'Nivel', shift: 1}, {word:'Ataque', shift: 1}, {word:'nivel', shift: 1},
                 {word:'Entrenador', shift: 1}, {word:'Pokémon', shift: 1}, {word:'zona', shift:1}, {word:'Bosque', shift: 0}, {word:'Cueva', shift: 0}];
            prediction = replaceKeyWithPossibility(keywords);
            document.querySelector('#content').innerHTML = prediction;
        }).then(() => {
            // animateText(document.querySelector('#content').textContent, 500, document.querySelector('#content'), () => {
            //     document.querySelector('#content').innerHTML += '...';
            // });
            // document.querySelector('#content').innerHTML = '';
            // animateTextCharByChar(prediction, 5, document.querySelector('#content'), () => {
            //     document.querySelector('#content').innerHTML += '...';
            // });
            animateText(prediction, 100, document.querySelector('#content'));
        })
        .then(() => {
        });
}

function f() {
    // console.log('Generating text...');
    // if (!trained) {
    //     loadCorpus();
    //     setTimeout(gentext, 1000);
    //     return;
    // }
    prefix = `Ruta ${Math.random().toString()[2]} `;

    fetch(corpus).then(response => {
        console.log('Corpus loaded');
        response.text().then(text => {
            markov.train(text, () => {
                console.log('Corpus trained');
                trained = true;
                let prediction = markov.predict(700, { start: prefix, alpha: 1 });
                animateText(prediction, 500, document.querySelector('#content'), () => {
                    document.querySelector('#content').innerHTML += '...';
                });
            });
        });        
    });
}


function animateTextCharByChar(text, delay = 100, element = document.querySelector('div'), callback = null) {
    generationInterval && clearInterval(generationInterval);
    let index = 0;
    generationInterval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text[index];
            index++;
        } else {
            clearInterval(generationInterval);
            callback && callback();
        }
    }, delay);
}


function trimLastSentence(text) {
    let sentences = text.split('. ');
    if (sentences.length > 1) {
        sentences.pop();
    } else {
        // trim at last comma if there are no sentences
        sentences = text.split(', ');
        if (sentences.length > 1) {
            sentences.pop();
        } else {
            // if there are no commas, just trim the last word
            sentences = text.split(' ');
            sentences.pop();
            return sentences.join(' ') + '.';
        }
    }
    return sentences.join('. ') + '.';
}


