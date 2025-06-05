namespace prj381FrontEnd
{
    partial class Form1
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.btnCapture = new System.Windows.Forms.Button();
            this.txtBoxGesture = new System.Windows.Forms.TextBox();
            this.pnlCamera = new System.Windows.Forms.Panel();
            this.listFeedback = new System.Windows.Forms.ListBox();
            this.SuspendLayout();
            // 
            // btnCapture
            // 
            this.btnCapture.Location = new System.Drawing.Point(287, 25);
            this.btnCapture.Name = "btnCapture";
            this.btnCapture.Size = new System.Drawing.Size(150, 51);
            this.btnCapture.TabIndex = 0;
            this.btnCapture.Text = "Capture Gesture";
            this.btnCapture.UseVisualStyleBackColor = true;
            // 
            // txtBoxGesture
            // 
            this.txtBoxGesture.Location = new System.Drawing.Point(127, 41);
            this.txtBoxGesture.Name = "txtBoxGesture";
            this.txtBoxGesture.Size = new System.Drawing.Size(113, 20);
            this.txtBoxGesture.TabIndex = 1;
            this.txtBoxGesture.Text = "Enter Gesture Name";
            // 
            // pnlCamera
            // 
            this.pnlCamera.Location = new System.Drawing.Point(12, 97);
            this.pnlCamera.Name = "pnlCamera";
            this.pnlCamera.Size = new System.Drawing.Size(623, 542);
            this.pnlCamera.TabIndex = 2;
            // 
            // listFeedback
            // 
            this.listFeedback.FormattingEnabled = true;
            this.listFeedback.Location = new System.Drawing.Point(641, 97);
            this.listFeedback.Name = "listFeedback";
            this.listFeedback.Size = new System.Drawing.Size(1450, 212);
            this.listFeedback.TabIndex = 3;
            // 
            // Form1
            // 
            this.ClientSize = new System.Drawing.Size(2147, 852);
            this.Controls.Add(this.listFeedback);
            this.Controls.Add(this.pnlCamera);
            this.Controls.Add(this.txtBoxGesture);
            this.Controls.Add(this.btnCapture);
            this.Name = "Form1";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button btnCapture;
        private System.Windows.Forms.TextBox txtBoxGesture;
        private System.Windows.Forms.Panel pnlCamera;
        private System.Windows.Forms.ListBox listFeedback;
    }
}

