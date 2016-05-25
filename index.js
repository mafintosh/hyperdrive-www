var drop = require('drag-and-drop-files')
var fileReader = require('filereader-stream')
var concat = require('concat-stream')
var hyperdrive = require('hyperdrive')
var swarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var memdb = require('memdb')
var mime = require('mime')

var db = memdb()
var drive = hyperdrive(db)

var key = window.location.toString().split('#')[1]
var archive = drive.createArchive(key, {live: true})
var sw = swarm(signalhub('hyperdrive-www-live-' + archive.key.toString('hex'), 'https://signalhub.mafintosh.com'))

window.location = '#' + archive.key.toString('hex')

sw.on('peer', function (peer) {
  peer.pipe(archive.replicate()).pipe(peer)
})

var index = 0

archive.list({live: true}).on('data', function (entry) {
  var $files = document.getElementById('files')
  var i = index++

  var li = document.createElement('li')
  li.innerHTML = '<a href="javascript:void(0)">' + entry.name + '</a>'
  $files.appendChild(li)
  li.onclick = function () {
    archive.createFileReadStream(i).pipe(concat(function (data) {
      document.getElementById('display').style.display = 'block'
      document.getElementById('display').src = 'data:' + mime.lookup(entry.name) + ';base64,' + data.toString('base64')
    }))
  }
})

drop(document.body, function (files) {
  var i = 0
  loop()

  function loop () {
    if (i === files.length) return console.log('added files')

    var file = files[i++]
    var stream = fileReader(file)
    stream.pipe(archive.createFileWriteStream(file.name)).on('finish', loop)
  }
})
