const scrape = require('website-scraper');

let options = {
    urls: ['http://choigames.net/duoi-hinh-bat-chu'],
    directory: './folder_output',
};

scrape(options).then((result) => {
    console.log("Website succesfully downloaded");
}).catch((err) => {
    console.log("An error ocurred", err);
});