import React, { useState, useEffect, useRef } from "react";
import DropDown from "./DropDown";

const baudRateOptions = [
    9600,
    14400,
    19220,
    28800,
    38400,
    57600,
    115200,
    230400,
    260800,
    921600,
    //'custom'
]
const dataBitsOptions = [
    7, 
    8
]
const parityOptions = [
    'none',
    'even',
    'odd'
]
const stopBitsOptions = [
    1, 
    2
]
const FlowControlOptions = [
    'none', 
    'hardware'
]
const defaultBaudRate = 9600
const defaultBufferSize = 255
const defaultDataBits = 8
const defaultParity = 'none'
const defaultStopBits = 1
const defaultFlowControl = 'none'

function App() {
    const [port, setPort] = useState(null)

    const [baudRate, setBaudRate] = useState(defaultBaudRate)
    const [bufferSize, setBufferSize] = useState(defaultBufferSize)
    const [dataBits, setDataBits] = useState(defaultDataBits)
    const [parity, setParity] = useState(defaultParity)
    const [stopBits, setStopBits] = useState(defaultStopBits)
    const [flowControl, setFlowControl] = useState(defaultFlowControl)

    const [writeBufferContent, setWriteBufferContent] = useState('')
    const [readDataContent, setReadDataContent] = useState('')

    const [isReading, setIsReading] = useState(false)
    var textDecoder
    const readableStreamClosed = useRef(null)
    const reader = useRef(null)


    async function handleConnection(){
        if (port === null) {
            try {
                setPort(await navigator.serial.requestPort())
            } catch (err) {
                console.log(`error in requestPort: no port is chosen.\n\nerror message:\n${err}`)
            }
        } else {
            setWriteBufferContent('')
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
                        baudRate: baudRate,
                        dataBits: dataBits,
                        stopBits: stopBits,
                        bufferSize: bufferSize,
                        parity: parity,
                        flowControl: flowControl,
                    };
                    await port.open(portOpenOption);
                    alert(`connected \n
                        vendor id: ${port.getInfo().usbVendorId} \n
                        product id:  ${port.getInfo().usbProductId}`);
                } catch (err) {
                    console.log(err)
                    alert(`Failed to open serial port.\nThe port might be already open, or there might be something wrong with the device.`)
                    setPort(null)
                }
            }
        }
        tryOpenPort()
    }, [baudRate, bufferSize, dataBits, flowControl, parity, port, stopBits])

    function handleChangeOption({target}){
        if (target.name === 'baudRate') {
            setBaudRate(target.value);
        } else if (target.name === 'dataBits'){
            setDataBits(target.value)
        } else if (target.name === 'parity'){
            setParity(target.value)
        } else if (target.name === 'stopBits'){
            setStopBits(target.value)
        } else if (target.name === 'flowControl'){
            setFlowControl(target.value)
        } else if (target.name === 'bufferSize'){
            setBufferSize(target.value)
        }
    }

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
            console.log(`i wrote: "${writeBufferContent}"`)
            setWriteBufferContent("")
        }
    }

    async function handleReadPort(){
        setIsReading(true)
        textDecoder = new TextDecoderStream();
        readableStreamClosed.current = port.readable.pipeTo(textDecoder.writable);
        reader.current = textDecoder.readable.getReader()
        try {
            while (true) {
                const { value, done } = await reader.current.read()
                if (done) {
                  // |reader| has been canceled.
                  reader.current.releaseLock()
                  break
                }
                console.log(`i read: "${value}"`)
                setReadDataContent(value)
            }
        } catch (err){
            console.log(`error in handleReadPort: ${err}`)
        }
    }

    async function handleStopReadingPort(){
        setIsReading(false)
        setReadDataContent('')
        reader.current.cancel();
        await readableStreamClosed.current.catch(() => { /* Ignore the error */ }); 
    }

  return (
    <div className="App">
        <div className="container">
            <div className="part">
                <h3>connect port</h3>
                <div className='portConnectionGroup'>
                    <div>
                        <button onClick={handleConnection} disabled={isReading? true:false}>{port!==null? 'disconnect':'connect'}</button>
                    </div>
                    <DropDown name="baudRate" value={baudRate} items={baudRateOptions} onChange={handleChangeOption} isDisabled={port!==null? true:false}/>
                    <DropDown name="dataBits" value={dataBits} items={dataBitsOptions} onChange={handleChangeOption} isDisabled={port!==null? true:false}/>
                    <DropDown name="parity" value={parity} items={parityOptions} onChange={handleChangeOption} isDisabled={port!==null? true:false}/>
                    <DropDown name="stopBits" value={stopBits} items={stopBitsOptions} onChange={handleChangeOption} isDisabled={port!==null? true:false}/>
                    <DropDown name="flowControl" value={flowControl} items={FlowControlOptions} onChange={handleChangeOption} isDisabled={port!==null? true:false}/>
                    <div className="portOpenOptionField">
                        <label htmlFor="bufferSize">bufferSize</label>
                        <input type="text" name="bufferSize" value={bufferSize} onChange={handleChangeOption} disabled={port!==null? true:false}/>
                    </div>
                </div>
            </div>
            <div className="part">
                <h3>write port</h3>
                <textarea type="text" value={writeBufferContent} onChange={handleChangeWriteBufferContent} disabled={port!==null? false:true} placeholder={port!==null? "write something":"cannot write, port is not connected"}></textarea> 
                <div>
                    <button onClick={handleWritePort} disabled={port!==null? false:true}>write</button>
                </div>
            </div>
            <div className="part">
                <h3>read port</h3>
                <textarea value={readDataContent} disabled={readDataContent!==""? false:true} placeholder={port!==null? (isReading? readDataContent:`click 'read' button to start reading`):"cannot read, port is not connected"}></textarea> 
                <div>
                    <button onClick={isReading? handleStopReadingPort:handleReadPort} disabled={port!==null? false:true}>{isReading? 'stop read':'read'}</button>
                </div>
            </div>
        </div>
    </div>
  );
}

export default App
