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


// this function reviews the current generated texts
// and replaces certain words with an <input><options> element 
// that allows the user to select one of the possible next words according to the markov chain
function replaceKeyWithPossibility(keywords=[]) {
    const words = text.split(' ');
    words.forEach(element => {
        if (keywords.includes(element)) {
            const select = document.createElement('select');
            const options = markov.getNextPossibleWords(element, 5);
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                select.appendChild(optionElement);
            });
            element.replaceWith(select);
        }
    });
}



function gentext() {
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


