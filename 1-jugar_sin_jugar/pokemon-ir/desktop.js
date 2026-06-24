// window movement and control buttons
const windowElement = document.querySelector('.window');
const windowTitle = windowElement.querySelector('.title-bar');
const closeButton = document.querySelector('.close-button');

let isDragging = false;
let offsetX, offsetY;

//////////////////////////////////////////////////////////
// Window movement
windowTitle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - windowElement.offsetLeft;
    offsetY = e.clientY - windowElement.offsetTop;
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {                
        // wobbly deformation
        let skewX = -((e.clientX - offsetX) - parseInt(windowElement.style.left)) / 10;
        windowElement.style.transform = `skewX(${skewX}deg)`;

        let scaleV = -((e.clientY - offsetY) - parseInt(windowElement.style.top)) / 300;
        windowElement.style.transform += ` scaleY(${1 + scaleV})`;

        windowElement.style.left = `${e.clientX - offsetX}px`;
        windowElement.style.top = `${e.clientY - offsetY}px`;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    windowElement.style.transform = 'none';
});

//////////////////////////////////////////////////////////
// window control buttons
closeButton.addEventListener('click', () => {
    // animateResizeWindow({ top: windowElement.offsetHeight / 2, left: windowElement.offsetTop / 2, width: 0, height: 0 }, 300);
    windowElement.style.display = 'none';
});


//////////////////////////////////////////////////////////
// open window
function openPoke() {
    windowElement.style.display = 'block';
    gentext();
}
