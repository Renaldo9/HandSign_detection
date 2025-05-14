# AI-Based Hand Gesture Recognition for Text-to-Speech Communication

A real-time system that translates sign-language hand gestures into spoken words, improving accessibility for hearing- and speech-impaired users.

---

## Features

- **Real-time hand tracking** via MediaPipe + OpenCV  
- **Gesture classification** using a CNN (TensorFlow/Keras or PyTorch)  
- **Customizable gesture set**: define your own signs (e.g. “Hello”, “Thank you”, “Help”)  
- **Text-to-Speech output** (gTTS or pyttsx3)  
- **Tkinter GUI** for live video feed and sentence display  

---

## Setup instructions

**Python version used:**
3.12.9

### **To setup create a virtual environment then install requirements.txt**
### Using VSCODE(easy way)
1. Press the python version in the bottom right

![image](https://github.com/user-attachments/assets/5ae005b8-d755-4961-bc70-42ef8625f0c1)

3. Create Virtual Environment

![image](https://github.com/user-attachments/assets/66654129-b017-4e5c-8f2d-b96f9cf42137)

4. Create venv

![image](https://github.com/user-attachments/assets/75b0a75f-0ff8-45df-a7bb-eba42785ee62)

5. Choose python version (python 3.12.9 was tested and works)

![image](https://github.com/user-attachments/assets/ba7b7e18-8760-4554-a367-0a0ed1c44e50)

6. Select requirements.txt as a dependency to install

![image](https://github.com/user-attachments/assets/a76eccd6-c33e-48b2-a79b-96195520a1cf)

wait for everything to install, might take a while

### Using terminal

1. create virtual environment

```python -m venv .venv```

2. activate virtual environment

**Windows:**

```.venv\Scripts\activate```

**macOS/Linux:**

```source .venv/bin/activate```

3. Install dependencies

```pip install -r requirements.txt```
