New files:

 * server.py should be run on the server

 * src/solved-callback.js is included directly into p.html, and copies the
   literal `<script>` tag from puzz.link's p.html with modifications

 * src/BitStream.js is used to store recordings

 * src/puzzle/Recording.js implements all of the logic for recordings

 * src-ui/js/ui/LocalDb.js provides most of the functionality interfacing with
   the localdb server

 * src-ui/css/dark.css provides the dark theme

 * test/pzplus.js

Changes from base puzz.link:

 * Puzzle objects have a recording property, which the OperationManager
   interacts with

 * Operation objects have getSignature, encodeBin, decodeBin, [playback]

 * new Pzplus* Operations introduced
