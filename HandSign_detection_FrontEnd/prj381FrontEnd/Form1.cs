using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace prj381FrontEnd
{
    public partial class Form1 : Form
    {
        [DllImport("user32.dll")]
        static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

        [DllImport("user32.dll")]
        static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

        private Process pythonProcess;

        public Form1()
        {
            InitializeComponent();
            btnCapture.Click += BtnCapture_Click;
        }

        private void BtnCapture_Click(object sender, EventArgs e)
        {
            string gestureName = txtBoxGesture.Text.Trim();
            if (string.IsNullOrWhiteSpace(gestureName) || gestureName == "Enter Gesture Name")
            {
                MessageBox.Show("Please enter a valid gesture name.");
                return;
            }

            string pythonExe = @"C:\Users\xavie\AppData\Local\Programs\Python\Python311\python.exe";        // Path to your python executable
            string scriptPath = @"C:\Users\xavie\OneDrive\Documents\GitHub\HandSign_detection\record.py";   // path to the record.py script on visual studio code

            var psi = new ProcessStartInfo
            {
                FileName = pythonExe,
                Arguments = $"\"{scriptPath}\" \"{gestureName}\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = System.IO.Path.GetDirectoryName(scriptPath)
            };

            pythonProcess = new Process { StartInfo = psi };
            pythonProcess.OutputDataReceived += (s, ev) =>
            {
                if (!string.IsNullOrWhiteSpace(ev.Data))
                {
                    AppendToFeedback(ev.Data);
                }
            };
            pythonProcess.ErrorDataReceived += (s, ev) =>
            {
                if (!string.IsNullOrWhiteSpace(ev.Data))
                {
                    AppendToFeedback("[ERROR] " + ev.Data);
                }
            };

            try
            {
                pythonProcess.Start();
                pythonProcess.BeginOutputReadLine();
                pythonProcess.BeginErrorReadLine();

                Thread dockThread = new Thread(() => DockPythonWindow());
                dockThread.IsBackground = true;
                dockThread.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to run Python script:\n" + ex.Message);
            }
        }

        private void AppendToFeedback(string message)
        {
            if (listFeedback.InvokeRequired)
            {
                listFeedback.Invoke(new Action(() => listFeedback.Items.Add(message)));
            }
            else
            {
                listFeedback.Items.Add(message);
            }
        }

        private void DockPythonWindow()
        {
            IntPtr pythonWnd = IntPtr.Zero;
            int retries = 0;

            while (pythonWnd == IntPtr.Zero && retries < 20)
            {
                if (pythonProcess.HasExited)
                {
                    AppendToFeedback("[ERROR] Python process exited early.");
                    return;
                }

                Thread.Sleep(500);
                pythonProcess.Refresh();
                pythonWnd = pythonProcess.MainWindowHandle;
                retries++;
            }

            if (pythonWnd != IntPtr.Zero)
            {
                Invoke(new Action(() =>
                {
                    SetParent(pythonWnd, pnlCamera.Handle);
                    MoveWindow(pythonWnd, 0, 0, pnlCamera.Width, pnlCamera.Height, true);
                    listFeedback.Items.Add("[INFO] Python window docked.");
                }));
            }
            else
            {
                AppendToFeedback("[ERROR] Could not dock the Python window.");
            }
        }
    }
}
