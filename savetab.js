// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var saveTabs = document.getElementById('buttonDiv');

const otherBookmarksFolderId = "2";
const temporaryBookmarkFolderName = "暂存书签";
const windowPrefix = "window-";
const incognitoPrefix = "incognito-";

saveTabs.onclick = function () {
    getTemporaryBookmarkFolderId().then(getDateFolder).then(saveAllTabs);
};

function getTemporaryBookmarkFolderId() {
    var temporaryBookmarkFolderId = undefined;
    return new Promise(function (resolve) {
        chrome.bookmarks.getChildren(otherBookmarksFolderId, function (results) {
            for (var i = 0; i < results.length; i++) {
                if (results[i].title === temporaryBookmarkFolderName) {
                    temporaryBookmarkFolderId = results[i].id;
                    console.log("found temporary bookmark folder id: ", temporaryBookmarkFolderId);
                    resolve(temporaryBookmarkFolderId);
                    break;
                }
            }
            if (temporaryBookmarkFolderId === undefined) {
                createTemporaryBookmarkFolder().then(resolve);
            }
        });
    });
}

function createTemporaryBookmarkFolder() {
    return new Promise(function (resolve) {
        chrome.bookmarks.create({
            'parentId': otherBookmarksFolderId,
            'title': temporaryBookmarkFolderName
        }, function (result) {
            console.log("create temporary bookmark folder with id: ", result.id);
            resolve(result.id);
        });
    });
}

function getDateFolder(temporaryBookmarkFolderId) {
    var dateFolderId = undefined;
    return new Promise(function (resolve) {
        var dateString = formatDate(new Date());
        chrome.bookmarks.getChildren(temporaryBookmarkFolderId, function (results) {
            for (var i = 0; i < results.length; i++) {
                if (results[i].title === dateString) {
                    dateFolderId = results[i].id;
                    console.log("found date folder id: ", dateFolderId);
                    resolve(dateFolderId);
                    break;
                }
            }
            if (dateFolderId === undefined) {
                createDateFolder(temporaryBookmarkFolderId, dateString).then(resolve);
            }
        });
    })
}

function createDateFolder(temporaryBookmarkFolderId, dateString) {
    return new Promise(function (resolve) {
        chrome.bookmarks.create({
            'parentId': temporaryBookmarkFolderId,
            'title': dateString
        }, function (result) {
            console.log("create date folder with id: ", result.id);
            resolve(result.id);
        });
    });
}

function saveAllTabs(dateFolderId) {
    chrome.windows.getAll(function (windows) {
        saveAllTabsForDifferentWindowType(windows, dateFolderId, false);
        saveAllTabsForDifferentWindowType(windows, dateFolderId, true);
    });
}

function saveAllTabsForDifferentWindowType(windows, dateFolderId, isIncognito) {
    var windowIds = getWindowIds(windows, isIncognito);
    console.log("windowIds: ", windowIds);
    console.log("isIncognito: ", isIncognito);
    for (var i = 0; i < windowIds.length; i++) {
        createFolderForWindow(dateFolderId, windowIds[i], i, isIncognito).then(saveWindowTabs);
    }
}

function getWindowIds(windows, isIncognito) {
    return windows.filter(function (window) {
        return window.incognito === isIncognito;
    }).map(function (window) {
        return window.id;
    });
}

function createFolderForWindow(dateFolderId, windowId, i, isIncognito) {
    var windowFolderId = undefined;
    return new Promise(function (resolve) {
        chrome.bookmarks.create(
            {
                'parentId': dateFolderId,
                'title': (isIncognito ? incognitoPrefix : windowPrefix) + (i + 1)
            }, function (result) {
                windowFolderId = result.id;
                console.log("create window folder with id: ", windowFolderId);
                resolve([windowId, windowFolderId]);
            });
    });
}

function saveWindowTabs([windowId, windowFolderId]) {
    chrome.tabs.query({'windowId': windowId}, function (tabs) {
        tabs.forEach(function (tabItem) {
            chrome.tabs.get(tabItem.id, function (tab) {
                createBookmark(windowFolderId, tab);
            });
        });
    });
}

function createBookmark(windowFolderId, tab) {
    console.log("save bookmark for tab: ", tab.title);
    chrome.bookmarks.create(
        {
            'parentId': windowFolderId,
            'title': tab.title,
            'url': tab.url
        });
}