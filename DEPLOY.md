# Deploy FitQuest to GitHub Pages

Follow these steps to publish FitQuest online:

## 1. Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Set **Repository name** to `FitQuest` (or any name you prefer)
3. Choose **Public**
4. **Do not** add a README, .gitignore, or license (the project already has these)
5. Click **Create repository**

## 2. Push your code

In a terminal, run these commands from the FitQuest folder:

```bash
cd "c:\Users\camer\Documents\Cursor Projects\FitQuest"

git remote add origin https://github.com/YOUR_USERNAME/FitQuest.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## 3. Enable GitHub Pages

1. Open your repository on GitHub
2. Go to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose branch **main** and folder **/ (root)**
5. Click **Save**

## 4. Access your app

After a minute or two, your app will be live at:

**https://YOUR_USERNAME.github.io/FitQuest/**

You can add this to your iPhone home screen from Safari for the full app experience.
