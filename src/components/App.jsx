import React, { useState, useEffect } from "react";

function App() {
    var [isConnected, setIsConnected] = useState(false);
    var [conBtnText, setConBtnText] = useState("connect");
    var [port, setPort] = useState(null);
  
    var [isWriting, setIsWriting] = useState(false);
  var [writeBtnText, setWriteBtnText] = useState("write something");

  var [isReading, setIsReading] = useState(false);
  var [readBtnText, setReadBtnText] = useState("start reading");
  

  const usbVendorId = 2389;
  const usbProductId = 28704;
  const portRequestOption = {
    filters: [{ usbVendorId, usbProductId }],
  };
  const portOpenOption = {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    bufferSize: 255,
    parity: "none",
    flowControl: "none",
  };

  async function handleConnect() {
    if (!isConnected) {
      try {
        setPort(await navigator.serial.requestPort());
      } catch (e) {
        alert(e);
      }
    } else {
      try {
        await port.close();
        setPort(null);
        setIsConnected(false);
        setConBtnText("connect");
        alert(`disconnected \n
                vendor id: ${port.getInfo().usbVendorId} \n
                product id:  ${port.getInfo().usbProductId}`);
      } catch (e) {
        alert(e);
      }
    }
  }

  useEffect(() => {
    if (port !== null) {
      port.open(portOpenOption);
      setIsConnected(true);
      setConBtnText("disconnect");
      alert(`connected \n
                  vendor id: ${port.getInfo().usbVendorId} \n
                  product id:  ${port.getInfo().usbProductId}`);
    }
  }, [port]);
  
    async function handleWriteData() {
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      const input = prompt("enter what you want to write: ");
      setIsWriting(true);
      try {
        await writer.write(encoder.encode(input));
      } catch (e) {
        alert(e);
      } finally {
        writer.releaseLock();
        alert(`i wrote: "${input}"`);
      }
    }

    async function handleReadData() {
      let reader = port.readable.getReader();
      const decoder = new TextDecoder();
      if (reader && !isReading) {
        setIsReading(true);
        setReadBtnText("stop reading");
        alert("started reading");
        while (port.readable) {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                // |reader| has been canceled.
                alert("end");
                break;
              }
              // Do something with |value|…
              const str = decoder.decode(value);
              alert(`i read: "${str}"`);
            }
          } catch (e) {
            alert(e);
          } finally {
            reader.releaseLock();
            reader = null;
            alert("stopped reading");
          }
        }
      } else {
        if (reader) {
          reader.cancel();
          reader = null;
          setIsReading(false);
          setReadBtnText("start reading");
          alert("stopped reading");
        }
      }
    }

  return (
    <div className="App">
      <button onClick={handleConnect}>{conBtnText}</button>
      <button onClick={handleWriteData}>{writeBtnText}</button>
      <button onClick={handleReadData}>{readBtnText}</button>
    </div>
  );
}

export default App;
