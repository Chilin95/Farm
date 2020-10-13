const path = require('path');
const express = require('express');
const router = express();
const port = 7777;

process.on('message', (filename) => {
    console.log(filename);
    router.get(`/`, (req, res)=>{res.send('WHY?')});
    router.get(`/audios/${filename}`, function(req, res){
        res.download(`${path.resolve('./')}/audios/${filename}.mp3`, filename+'.mp3',(err)=>{
            console.error;
            res.status(404).end();
        });
    });
});
router.listen(port, ()=>console.log(port));

// let conter = 0;
// setInterval(() => {
//     process.send({counter: counter++});
// }, 1000);
