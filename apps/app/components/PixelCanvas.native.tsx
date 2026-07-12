import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { PixelCanvasProps, PixelCanvasRef, StickerExport } from "./PixelCanvas.types";

export type { PixelCanvasRef, StickerExport };

const GRID = 64;
const SIZE = 320;

function makeHtml(size: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
 html,body{width:${size}px;height:${size}px;background:transparent;display:flex;justify-content:center;align-items:center;overflow:hidden}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;width:${size}px;height:${size}px}
</style>
</head>
<body>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
var GRID=${GRID},SIZE=${size},CELL=SIZE/GRID;
var c=document.getElementById('c'),ctx=c.getContext('2d');
var brushColor='#111827';
var grid=Array.from({length:GRID},function(){return Array(GRID).fill('')});
function draw(){ctx.clearRect(0,0,SIZE,SIZE);for(var r=0;r<GRID;r++){for(var c$=0;c$<GRID;c$++){if(grid[r][c$]){ctx.fillStyle=grid[r][c$];ctx.fillRect(c$*CELL,r*CELL,CELL,CELL)}}}}
function cell(x,y){var r=c.getBoundingClientRect();return{row:Math.min(GRID-1,Math.max(0,Math.floor((y-r.top)*(SIZE/r.height)/CELL))),col:Math.min(GRID-1,Math.max(0,Math.floor((x-r.left)*(SIZE/r.width)/CELL)))}}
function paint(x,y){var p=cell(x,y);grid[p.row][p.col]=brushColor;draw()}
c.addEventListener('click',function(e){paint(e.clientX,e.clientY)});
c.addEventListener('touchstart',function(e){e.preventDefault();var t=e.touches[0];paint(t.clientX,t.clientY)},{passive:false});
c.addEventListener('touchmove',function(e){e.preventDefault();var t=e.touches[0];paint(t.clientX,t.clientY)},{passive:false});
function onMsg(e){var m;try{m=typeof e.data==='string'?JSON.parse(e.data):e.data}catch(e){return}
switch(m.type){case'setBrushColor':brushColor=m.color;break
case'clear':grid=Array.from({length:GRID},function(){return Array(GRID).fill('')});draw();break
case'getPixelData':var o=document.createElement('canvas');o.width=GRID;o.height=GRID;var ox=o.getContext('2d');for(var r=0;r<GRID;r++){for(var c$=0;c$<GRID;c$++){if(grid[r][c$]){ox.fillStyle=grid[r][c$];ox.fillRect(c$,r,1,1)}}}
var u=o.toDataURL('image/png');window.ReactNativeWebView.postMessage(JSON.stringify({type:'pixelData',base64:u.substring('data:image/png;base64,'.length),dataUrl:u}));break}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);draw();
</script>
</body>
</html>`;
}

export const PixelCanvas = forwardRef<PixelCanvasRef, PixelCanvasProps>(function PixelCanvas(
  { brushColor = "#111827", size = SIZE },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const exportResolveRef = useRef<((value: StickerExport | null) => void) | null>(null);
  const canvasSize = Math.round(size);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        webviewRef.current?.postMessage(JSON.stringify({ type: "clear" }));
      },
      exportAsBase64: () =>
        new Promise<StickerExport | null>((resolve) => {
          exportResolveRef.current = resolve;
          webviewRef.current?.postMessage(JSON.stringify({ type: "getPixelData" }));
        }),
    }),
    [],
  );

  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ type: "setBrushColor", color: brushColor }));
  }, [brushColor]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);

    if (msg.type === "pixelData" && exportResolveRef.current) {
      exportResolveRef.current({
        base64: msg.base64,
        dataUrl: msg.dataUrl,
        filename: "sticker.png",
        mimeType: "image/png",
      });
      exportResolveRef.current = null;
    }
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html: makeHtml(canvasSize) }}
        onMessage={handleMessage}
        style={[styles.webview, { height: canvasSize, width: canvasSize }]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  webview: {
    flex: 0,
    width: SIZE,
    height: SIZE,
    backgroundColor: "transparent",
  },
});
