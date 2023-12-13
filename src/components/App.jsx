import React, { useState, useEffect, useRef } from "react";

const defaultBaudRate = 115200
const defaultBufferSize = 255
const defaultDataBits = 8
const defaultParity = 'none'
const defaultStopBits = 1
const defaultFlowControl = 'none'

const filterEvenElements = (array) => {
    return array.filter((e, i) => !(i % 2))
}

class LineBreakTransformer {
    terminator = [0x0d, 0x0a] //\r\n
    terminatorIndex

    constructor() {
        this.container = []
    }

    transform(chunk, controller) {
        chunk.forEach((elem) => this.container.push(elem))
        this.terminatorIndex = this.indexOfSubarray(
            this.container,
            this.terminator
        )
        while (this.terminatorIndex !== -1) {
            const line = this.container.slice(
                0,
                this.terminatorIndex + this.terminator.length
            )
            
            controller.enqueue(filterEvenElements(line.slice(0, -2))) //parse as normal array, take even elems, exclude \r and \n  

            this.container = this.container.slice(
                this.terminatorIndex + this.terminator.length
            )
            this.terminatorIndex = this.indexOfSubarray(
                this.container,
                this.terminator
            )
        }
    }

    flush(controller) {
        if (this.container.length > 0) {
            controller.enqueue(new Uint8Array(this.container))
        }
    }

    indexOfSubarray(array, subArray) {
        for (let i = 0; i <= array.length - subArray.length; i++) {
            if (
                this.arraysEqual(array.slice(i, i + subArray.length), subArray)
            ) {
                return i
            }
        }
        return -1
    }

    arraysEqual(arr1, arr2) {
        return (
            arr1.length === arr2.length &&
            arr1.every((value, index) => value === arr2[index])
        )
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
            await handleStopReadingPort()
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
                    //...
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
        try {
            var mystr = writeBufferContent
            var myarr = JSON.parse(mystr)//mystr.split(' ').map(elem => parseInt(elem))
            var mybuf = new Uint8Array(myarr)
            console.log('i write')
            console.log(mybuf)
            await writer.write(mybuf)
        } catch (err) {
            console.log(`error in handleChangeWriteBufferContent: ${err}`)
        } finally {
            writer.releaseLock();
            setWriteBufferContent("")
        }
    }

    async function handleReadPort(){
        setIsReading(true)
        var lineBreakTransformStream = new TransformStream(new LineBreakTransformer());
        readableStreamClosed.current = port.readable.pipeTo(lineBreakTransformStream.writable);
        reader.current = lineBreakTransformStream.readable.getReader()
        
        try {
            while (true) {
                const { value, done } = await reader.current.read()
                if (done) {
                  // |reader| has been canceled.
                  reader.current.releaseLock()
                  break
                }
                readerAccumulated += '['+value+']\n\n'
                console.log('i read')
                console.log(value)
                setReadDataContent(readerAccumulated)
            }
        } catch (err){
            console.log(`error in handleReadPort: ${err}`)
        }
    }

    async function handleStopReadingPort(){
        if(isReading){
            setIsReading(false)
            setReadDataContent('')
            reader.current.cancel();
            await readableStreamClosed.current.catch(() => { /* Ignore the error */ }); 
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
                <div>
                    <button onClick={isReading? handleStopReadingPort:handleReadPort} disabled={port!==null? false:true}>{isReading? 'stop read':'read'}</button>
                </div>
            </div>
        </div>
    </div>
  );
}

export default App
