import React, { useState, useEffect, useRef } from "react";

const defaultBaudRate = 9600
const defaultBufferSize = 255
const defaultDataBits = 8
const defaultParity = 'none'
const defaultStopBits = 1
const defaultFlowControl = 'none'

class LineBreakTransformer {
    constructor() {
      this.container = '';
    }
  
    transform(chunk, controller) {
      this.container += chunk;
      const lines = this.container.split(' '); //'\r\n');
      this.container = lines.pop();
      lines.forEach(line => controller.enqueue(line));
    }
  
    flush(controller) {
      controller.enqueue(this.container);
    }
  }

function App() {
    const [port, setPort] = useState(null)

    const [writeBufferContent, setWriteBufferContent] = useState('')
    const [readDataContent, setReadDataContent] = useState('')

    const [isReading, setIsReading] = useState(false)
    const readableStreamClosed = useRef(null)
    const reader = useRef(null)
    var readerAccumulated = ''


    async function handleConnection(){
        if (port === null) {
            try {
                setPort(await navigator.serial.requestPort())
            } catch (err) {
                console.log(`error in requestPort: no port is chosen.\n\nerror message:\n${err}`)
            }
        } else {
            setWriteBufferContent('')
            //stop reading port
            setIsReading(false)
            setReadDataContent('')
            reader.current.cancel();
            await readableStreamClosed.current.catch(() => { /* Ignore the error */ }); 
            try {
                await port.close()
                setPort(null)
                alert(`disconnected \n
                     vendor id: ${port.getInfo().usbVendorId} \n
                     product id:  ${port.getInfo().usbProductId}`)
            } catch (err) {
                console.log(`error in handleConnection: ${err}`)
            }
        }
    }

    useEffect(() => {
        async function tryOpenPort(){
            if (port !== null) {
                try{
                    const portOpenOption = {
                        baudRate: defaultBaudRate,
                        dataBits: defaultDataBits,
                        stopBits: defaultStopBits,
                        bufferSize: defaultBufferSize,
                        parity: defaultParity,
                        flowControl: defaultFlowControl,
                    };
                    await port.open(portOpenOption);
                    alert(`connected \n
                        vendor id: ${port.getInfo().usbVendorId} \n
                        product id:  ${port.getInfo().usbProductId}`);
                    //read
                    setIsReading(true)
                    var textDecoder = new TextDecoderStream();
                    readableStreamClosed.current = port.readable.pipeTo(textDecoder.writable);
                    reader.current = textDecoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer())).getReader()
                    try {
                        while (true) {
                            const { value, done } = await reader.current.read()
                            if (done) {
                              // |reader| has been canceled.
                              reader.current.releaseLock()
                              break
                            }
                            readerAccumulated += value + '\n'
                            console.log(`i read value = ${value}`)
                            setReadDataContent(readerAccumulated)
                        }
                    } catch (err){
                        console.log(`error in handleReadPort: ${err}`)
                    }
                } catch (err) {
                    console.log(err)
                    alert(`Failed to open serial port.\nThe port might be already open, or there might be something wrong with the device.`)
                    setPort(null)
                }
            }
        }
        tryOpenPort()
    }, [port])


    function handleChangeWriteBufferContent({target}){
        setWriteBufferContent(target.value)
    }

    async function handleWritePort(){
        const writer = port.writable.getWriter()
        const encoder = new TextEncoder()
        try {
            await writer.write(encoder.encode(writeBufferContent))
        } catch (err) {
            console.log(`error in handleChangeWriteBufferContent: ${err}`)
        } finally {
            writer.releaseLock();
            console.log(`i wrote: "${encoder.encode(writeBufferContent)}"`)
            console.log(`i wrote: "${writeBufferContent}"`)
            setWriteBufferContent("")
        }
    }

  return (
    <div className="App">
        <div className="container">
            <div className="part">
                <h3>connect port</h3>
                <div className='portConnectionGroup'>
                    <div>
                    <button onClick={handleConnection} >{port!==null? 'disconnect':'connect'}</button>
                    </div>
                </div>
            </div>
            <div className="part">
                <h3>write port</h3>
                <textarea type="text" value={writeBufferContent} onChange={handleChangeWriteBufferContent} disabled={port!==null? false:true} placeholder={port!==null? "write something":"port is not connected"}></textarea> 
                <div>
                    <button onClick={handleWritePort} disabled={port!==null? false:true}>write</button>
                </div>
            </div>
            <div className="part">
                <h3>read port</h3>
                <textarea value={readDataContent} disabled={true} placeholder={port!==null? (isReading? readDataContent:''):"port is not connected"}></textarea>
            </div>
        </div>
    </div>
  );
}

export default App
