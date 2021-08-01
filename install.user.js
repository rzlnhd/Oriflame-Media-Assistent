// ==UserScript==
// @name         Oriflame Media Assistant
// @description  An Assistant for generating and downloading Oriflame Media (including Catalog & Products)
// @author       Rizal Nurhidayat
// @version      0.1
// @copyright    2021, rzlnhd (https://github.com/rzlnhd/)
// @license      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @date         2021-8-1
// @match        https://*.oriflame.com/*
// @connect      oriflame.com
// @icon         https://oriflame.com/favicon.ico
// @run-at       document-end
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM.getResourceText
// @grant        GM.xmlhttpRequest
// @grant        GM.download
// @updateURL    https://raw.githubusercontent.com/rzlnhd/WhatsApp-Blast/master/update.meta.js
// @downloadURL  https://raw.githubusercontent.com/rzlnhd/WhatsApp-Blast/master/install.user.js
// @resource css https://raw.githubusercontent.com/rzlnhd/WhatsApp-Blast/master/assets/style.min.css
// ==/UserScript==

const xmlReq = ("function" == typeof GM_xmlhttpRequest) ? GM_xmlhttpRequest : GM.xmlhttpRequest,
    getRes = ("function" == typeof GM_getResourceText) ? GM_getResourceText : GM.getResourceText,
    download = ("function" == typeof GM_download) ? GM_download : GM.download;

var thisUrl = window.location.href, doing = false;

(function(){
    'use strict';

    let timer = setInterval(general, 1000);
    function general(){
        if(!!document.querySelector('article') || !!document.querySelector("div[class*='image_']")){
            initElements(thisUrl); clearInterval(timer);
        }
    }
})();

function isCatalogue(url) {
    return url.includes('Catalog');
}

function toArr(url){
    return url.split('/');
}

function initElements(url){
    if(url.includes('catalogue')){
        let elm = document.querySelector("article[class^='zero-slide']");
        addDownloadBtn(elm, 'Download All Catalog Images');
    } else if(url.includes('code')){
        let elms = document.querySelectorAll("div[class*='image_']");
        for(let elm of elms){addDownloadBtn(elm, 'Download This Image');}
    }
    addStyle(getRes('css'));
}

function addDownloadBtn(elm, title){
    let body = document.querySelector('body'), panel = document.createElement('div'), btn = document.createElement('div');
    panel.classList.add("oriassist-download"); btn.classList.add("oriassist-downloadBtn"); btn.title = title;
    panel.appendChild(btn); elm ? elm.prepend(panel) : body.append(panel);
    panel.addEventListener('click', proceedAction);
}

function forExternalImage(arr){
    let second = arr[arr.length - 1].split('&');
    second = second.slice(0,1);
    second[1] = 'imageFormat=PNG';
    arr[1] = second.join('&');
    return arr.join('?');
}

function remakeUrl(arrUrl, isCatalogue){
    let size = arrUrl.length;
    if(arrUrl[size - 1].includes('?')){
        let slice = arrUrl[size - 1].split('?');
        arrUrl[size - 1] = isCatalogue ? slice[0] : forExternalImage(slice);
    }
    return arrUrl.join('/');
}

function proceedAction(e){
    if(doing){alert('Wait a moment, Download is still running!'); return};
    let path = e.path, elm = path[2].localName == 'div' ? path[2] : path[2].nextSibling, url = elm.querySelector('img').src,
        isCat = isCatalogue(url), arrUrl = toArr(url), truUrl = remakeUrl(arrUrl, isCat);

    if(isCat){
        downloadCatalog(truUrl); doing = true;
    } else {
        downloadImage(truUrl, 'Product', getProductName(truUrl));
    }
}

function getProductName(url){
    let rgx = [/\d*_\d*.png/, /\d*.png/],
        name = rgx[0].exec(url) ?? rgx[1].exec(url);
    return name.toString();
}

function downloadImage(url, dir, name){
    download({
        url: url, name: `Images/${dir}/${name}`, saveAs: false,
        onload: () => {if(dir == 'Product'){alert('Image Downloaded Successfully');}},
    });
}

function downloadCatalog(url){
    xmlReq({
        method: "GET", url: url,
        onload: res => {
            let status = res.status, url = res.finalUrl,
                arr = toArr(url), details = getDetails(arr);
            if(status == 200){
                downloadImage(url, `Catalog/${details.period}`, details.name);
                downloadCatalog(nextUrl(arr));
            } else {
                alert('Catalog Downloaded Successfully'); doing = false
            }
        },
    });
}

function nextUrl(arr){
    let det = arr[arr.length - 1].split('-'), numb = parseInt(det[1]) +1;
    det[1] = numb.toString().padStart(3, "0"); arr[arr.length - 1] = det.join('-');
    return arr.join('/');
}

function getDetails(arr){
    let raw = arr[arr.length - 1], period = raw.split('-')[0], name = `${raw.split('.')[0]}.jpg`;
    return {period: period, name: name};
}

function addStyle(styles) {
    var css = document.createElement("style"); css.id = "oriassist-app";
    css.appendChild(document.createTextNode(styles));
    getElm("head").appendChild(css);
}