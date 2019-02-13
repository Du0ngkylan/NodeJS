const sqlite = require('sqlite');
var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
app.listen(3000);

const dbPromise = sqlite.open('./database/database.db', { Promise });
console.log(dbPromise);

app.get("/like/:id", async (req, res) => {
  var id = req.params.id;  
  try {
    const data = await dbPromise;
    await data.run(`UPDATE data SET Like = Like + 1 WHERE id = ?;`, id);
    console.log("update done!!!");
    res.send("update done!!!");
  } catch (err) {
    console.log(err);
  }
});

app.get("/dislike/:id", async (req, res) => {
  var id = req.params.id;  
  try {
    const data = await dbPromise;
    await data.run(`UPDATE data SET Dislike = Dislike + 1 WHERE id = ?;`, id);
    console.log("update done!!!");
    res.send("update done!!!");
  } catch (err) {
    console.log(err);
  }
});

app.get("/images/:id", async (req, res) => {
  var id = req.params.id;
  console.log(id);
  try {
    const data = await dbPromise;
    let maxItem = await data.get(`SELECT MAX(id) FROM data`);    
    let db = await data.get(`SELECT * FROM data WHERE id = ?;`, id);

    res.render("trangchu", {dangxem: id, max : maxItem['MAX(id)'], hinh : db.Item});    
  } catch (err) {
    console.log(err);
  }
});
