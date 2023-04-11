import logo from "./logo.svg";
import "./App.css";
import axios from "axios";
import { useEffect, useState } from "react";
import io from "socket.io-client";

function App() {
  // const [socket, setSocket] = useState(null);
  // another test
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3001");
  
    newSocket.on("progress", (data) => {
      setProgress(data);
    });

    newSocket.on("status", data => {
      setStatus(data);
    })
  }, []);

  async function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  async function test(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("file", file);

    const config = {
      onUploadProgress: function (progressEvent) {
        var percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      },
    };

    setStatus("Uploading file...")
    axios
      .post("http://localhost:3001/upload", data, config)
      .then((res) => {
        setStatus("File uploaded successfully")
        console.log(res)
      })
      .catch((err) => {
        setStatus("Error uploading file")
        console.log(err)
      });
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <div>
          <form>
            <input type="file" name="file" onChange={handleFileChange} style={{minWidth: "350px"}} /><br />
            <button onClick={test}>Upload</button>
          </form>
          {status && <p>Status: {status}</p>}
          {progress > 0 && <p>Progress: {progress}%</p>}
        </div>
        <div style={{ marginTop: "20px" }}>{/* <WebSocket /> */}</div>
      </header>
    </div>
  );
}

export default App;
