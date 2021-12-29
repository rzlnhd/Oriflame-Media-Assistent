// ==UserScript==
// @name         Oriflame Media Assistant
// @description  An Assistant for generating and downloading Oriflame Media (including Catalog & Products)
// @author       Rizal Nurhidayat
// @version      0.3.1
// @copyright    2021, rzlnhd (https://github.com/rzlnhd/)
// @license      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @date         2021-12-29
// @match        https://*.oriflame.com/*
// @connect      oriflame.com
// @connect      ipaper.io
// @icon         https://oriflame.com/favicon.ico
// @run-at       document-end
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_notification
// @grant        GM.getResourceText
// @grant        GM.xmlhttpRequest
// @grant        GM.download
// @grant        GM.notification
// @updateURL    https://raw.githubusercontent.com/rzlnhd/Oriflame-Media-Assistent/master/update.meta.js
// @downloadURL  https://raw.githubusercontent.com/rzlnhd/Oriflame-Media-Assistent/master/install.user.js
// @resource css https://raw.githubusercontent.com/rzlnhd/Oriflame-Media-Assistent/master/assets/style.min.css
// ==/UserScript==

(function(){
    'use strict';

    const getElmAll = q => {return document.querySelectorAll(q.trim());},
          getById = q => {return document.getElementById(q.trim());},
          getElm = q => {return document.querySelector(q.trim());},
          xmlReq = ("function" == typeof GM_xmlhttpRequest) ? GM_xmlhttpRequest : GM.xmlhttpRequest,
          getRes = ("function" == typeof GM_getResourceText) ? GM_getResourceText : GM.getResourceText,
          setNotif = ("function" == typeof GM_notification) ? GM_notification : GM.notification,
          download = ("function" == typeof GM_download) ? GM_download : GM.download;

    var thisUrl = window.location.href, doing = false,
        urlParams = new URLSearchParams(window.location.search);

    let timer = setInterval(general, 1000);
    function general(){
        let elm = getElm('article') || getElm("div[class*='image_']") || getElm("div[id*='img_']") || getElm("iframe.CiP1");
        if(elm){
            if (elm.tagName !== "IFRAME") initElements(thisUrl);
            clearInterval(timer);
        }
    };

    function isCatalogue(url) {
        return url.includes('Catalog') || url.includes('catalogue');
    };

    function initElements(url){
        if(url.includes('catalogue')){
            let elm = getElm("article[class^='zero-slide']") || getElm("div.CiP6") || getElm("div[class*='_body']");
            addDownloadBtn(elm, 'Download All Catalog Images');
        } else if(url.includes('code')){
            let elms = getElmAll("div[class*='image_']");
            if(elms.length == 0){
                elms = getElmAll("div.ui-product-detail .rsContent");
            }
            for(let elm of elms){addDownloadBtn(elm, 'Download This Image');}
        }
        addStyle(getRes('css'));
    };

    function addDownloadBtn(elm, title){
        let body = getElm('body'), panel = document.createElement('div'), btn = document.createElement('div');
        panel.classList.add("oriassist-download"); btn.classList.add("oriassist-downloadBtn"); btn.title = title;
        panel.appendChild(btn); elm ? elm.prepend(panel) : body.append(panel);
        panel.addEventListener('click', proceedAction);
        if (urlParams.get("downloadall") === 'true') panel.click();
    };

    function forExternalImage(url){
        let imgParams = new URLSearchParams(url), useless = [];
        imgParams.forEach((val, key) => {
            if (key != "externalMediaId") useless.push(key);
        });
        useless.forEach(e => imgParams.delete(e));

        imgParams.append('imageFormat', 'PNG');
        return imgParams.toString();
    };

    function remakeUrl(url){
        return thisUrl.includes('id-catalogue') ? url
            : url.replace(/^(.*)\?(.*)$/, function(m, g1, g2){
                let extra = !isCatalogue(url) ? `?${forExternalImage(g2)}` : '';
                return `${g1}${extra}`;
            });
    };

    function proceedAction(e){
        if(doing){
            setNotif({title:'Warning', text:'Wait a moment, Download is still running!', highlight: true}, null);
            return;
        };

        let path = e.path, elm = path[2].localName == 'div' ? path[2] : path[2].nextSibling,
            url = remakeUrl(elm.querySelector('img').src);

        if(isCatalogue(url) || isCatalogue(thisUrl)){
            downloadCatalog(url); doing = true;
        } else {
            downloadImage(url, 'Product', getProductName(url));
        }
    };

    function getProductName(url){
        return /\d*(?:_\d*)*.png/g.exec(url).toString();
    };

    function downloadImage(url, dir, name){
        download({
            url: url, name: `Images/${dir}/${name}`, saveAs: false,
            onload: () => {
                if(dir == 'Product'){
                    setNotif({title:'Success', text:'Image Downloaded Successfully', highlight: true}, null);
                }
            },
        });
    };

    function downloadCatalog(url){
        xmlReq({
            method: "GET", url: url,
            onload: res => {
                let status = res.status, url = res.finalUrl, details = getDetails(url);
                if(status == 200){
                    downloadImage(url, `Catalog/${details.period}`, details.name);
                    downloadCatalog(nextUrl(url));
                } else {
                    setNotif({title:'Success', text:'Catalog Downloaded Successfully!', highlight: true}, null);
                    doing = false
                }
            },
        });
    };

    function nextUrl(url){
        let isCat = thisUrl.includes('id-catalogue'),
            rgx = isCat ? /^(.*Pages\/)(\d+)(\/.*)$/g : /^(.*\d{4,}-)(\d{3})(.*)(?:\?.*)?$/g;
        url = url.replace(rgx, function(m, g1, g2, g3){
            let next = isCat ? `${parseInt(g2) + 1}` : `${parseInt(g2) + 1}`.padStart(3, "0");
            return g1 + next + g3;
        });
        return url;
    };

    function getDetails(url){
        let period, fileName;
        if (!thisUrl.includes('id-catalogue')) {
            url.replace(/^.*\/((\d{4,}).*)\..*$/g, function(m, g1, g2){
                fileName = `${g1}.jpg`; period = g2;
            });
        } else {
            period = /\d{4,}/.exec(thisUrl).toString();
            fileName = url.replace(/^(?:.*Pages\/)(\d+)(?:\/.*)$/g, function(m, g1){
                return `${period}_${g1}.jpg`;
            });
        }
        return {period: period, name: fileName};
    };

    function addStyle(styles) {
        var css = document.createElement("style"); css.id = "oriassist-app";
        css.appendChild(document.createTextNode(styles));
        getElm("head").appendChild(css);
    };
})();