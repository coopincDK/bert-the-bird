using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;



public static class Level {
	public static LevelControl Control = GameObject.FindWithTag("LevelControl").GetComponent<LevelControl>();
	public static LevelObject CurrentLevel;
	public static void MainMenu() {
		Control.LoadLevel(0);
	}
	public static void Load(int ID) {
		Control.LoadLevel(ID);
	}
	public static void EndGame() {
		Control.EndGame ();
	}
	public static void Restart() {
		Control.RestartLevel();
	}
	public static void SaveScore(int LevelID, ObscuredFloat time, ObscuredInt score, ObscuredInt streak, System.DateTime today) {
		/*** Save HighScores ***/
		HighScore CurrentScore = GetHighScore (CurrentLevel.ID);
		bool NewHighScore = false;
		bool NewHighScoreToday = false;
		//Save HighScore if better

		if (score >= CurrentScore.Score) {
			if (score == CurrentScore.Score) {
				if (streak >= CurrentScore.Streak) {
					if (streak == CurrentScore.Streak) {
						if (time > CurrentScore.Time) {
							NewHighScore = true;
						}
					}
					else {
						NewHighScore = true;
					}
				}
			} 
			else {
				NewHighScore = true;
			}
		}


		if (Format.ShortDate (today) != CurrentScore.Today) {
			NewHighScoreToday = true;
		}
		else {
			if (score >= CurrentScore.Today_Score) {
				if (score == CurrentScore.Today_Score) {
					if (streak >= CurrentScore.Today_Streak) {
						if (streak == CurrentScore.Today_Streak) {
							if (time > CurrentScore.Today_Time) {
								NewHighScoreToday = true;
							}
						}
						else {
							NewHighScoreToday = true;
						}
					}
				} 
				else {
					NewHighScoreToday = true;
				}
			}
		}


		if (NewHighScore) {
			ObscuredPrefs.SetInt ("HighScore_Score_Level_" + LevelID.ToString (), score);
			ObscuredPrefs.SetFloat ("HighScore_Time_Level_" + LevelID.ToString (), time);
			ObscuredPrefs.SetInt ("HighScore_Streak_Level_" + LevelID.ToString (), streak);
			Level.CurrentLevel.HighScore.Time = time;
			Level.CurrentLevel.HighScore.Streak = streak;
			Level.CurrentLevel.HighScore.Score = score;
			Level.CurrentLevel.PlayButton.GetComponent<LoadLevel> ().RefreshScores ();
		}



		//Save HighScore Today if better or new date+
		if (NewHighScoreToday) {
			ObscuredPrefs.SetFloat ("HighScore_Today_Time_Level_" + LevelID.ToString (), time);
			ObscuredPrefs.SetInt ("HighScore_Today_Score_Level_" + LevelID.ToString (), score);
			ObscuredPrefs.SetInt ("HighScore_Today_Streak_Level_" + LevelID.ToString (), streak);
			PlayerPrefs.SetString ("HighScore_Today_Level_" + LevelID.ToString (), Format.ShortDate(today));
			Level.CurrentLevel.HighScore.Today_Score = score;
			Level.CurrentLevel.HighScore.Today_Streak = streak;
			Level.CurrentLevel.HighScore.Today_Time = time;
			Level.CurrentLevel.HighScore.Today = Format.ShortDate(today);
		} 


		if (NewHighScore || NewHighScoreToday)
			SyncData.Edit.AddHighScore(LevelID);
	}

	public static HighScore GetHighScore(int LevelID) {
		//Load HighScore Data;
		HighScore hs = new HighScore ();
		hs.Time = ObscuredPrefs.GetFloat ("HighScore_Time_Level_" + LevelID.ToString ());
		hs.Score = ObscuredPrefs.GetInt ("HighScore_Score_Level_" + LevelID.ToString ());
		hs.Streak = ObscuredPrefs.GetInt ("HighScore_Streak_Level_" + LevelID.ToString ());
		hs.Today = PlayerPrefs.GetString ("HighScore_Today_Level_" + LevelID.ToString ());
		hs.Today_Time = ObscuredPrefs.GetFloat ("HighScore_Today_Time_Level_" + LevelID.ToString ());
		hs.Today_Score = ObscuredPrefs.GetInt ("HighScore_Today_Score_Level_" + LevelID.ToString ());
		hs.Today_Streak = ObscuredPrefs.GetInt ("HighScore_Today_Streak_Level_" + LevelID.ToString ());
		return hs;
	}
}

public class LevelControl : MonoBehaviour {
	public int DefaultLevel = 0;
	public GameSpeed Settings;
	public LevelObject[] Levels;
	public LevelObjectPool ObjPool;
	public GameObject Bird;
	public GameObject GameUI;
	public ScoreBoard ScoreBoard;
	public GameObject GUIScore;
	public GameObject GUITime;
	public GameObject GUIStreak;
	public GameObject GUIMenuButton;
	public GameObject GUILeaderboardButton;
	public GameObject GUIRetryButton;
	public GameObject GUIWallet;
	public GameObject GUIArchievments;
	public GameObject GUIMainMenu;
	public MenuPage LevelMenu;
	public UILabel GuiTimeLabel;
	public UILabel GuiScoreLabel;
	public UILabel GuiStreakLabel;
	public Camera SkyCamera;

	//Background Sprites
	public UISprite BackgroundSky1;
	public UISprite BackgroundSky2;
	public UISprite BackgroundSky3;
	public UISprite BackgroundBg1;
	public UISprite BackgroundBg2;
	public UISprite BackgroundBg3;
	public UISprite BackgroundMg1;
	public UISprite BackgroundMg2;
	public UISprite BackgroundMg3;
	public UISprite BackgroundFg1;
	public UISprite BackgroundFg2;
	public UISprite BackgroundFg3;


	BirdController bc;

	// Use this for initialization
	void Start () {
		bc = Bird.GetComponent<BirdController> ();
		LoadLevel (DefaultLevel);


	}
	
	public void RestartLevel () {


		LevelPool.SoftReset ();
		ShowGameGUI ();
		HideWallet ();
		HideScoreBoard ();
		ResetScore ();

		Settings.Speed = Level.CurrentLevel.StartSpeed;
		Settings.SetNewStages (Level.CurrentLevel.Stages, Level.CurrentLevel.StartSpeed);
		//Settings.MaxSpeed = Level.CurrentLevel.MaxSpeed;
		//Settings.SpeedGain = Level.CurrentLevel.SpeedGain;
		//ChangeMusic (Level.CurrentLevel.Music);

		LoadHighScore(Level.CurrentLevel.ID);
		Statics.GameRunning = true;
		PowerUpSpawner.instance.Reset ();
		bc.resetBird();


	}


	public void LoadLevel (int Index) {
		ResetScore ();
		Statics.GameRunning = true;
		Level.CurrentLevel = Levels[Index];
		ObjPool.Props = Level.CurrentLevel.Props;
		ObjPool.PreloadGameObjects ();
		Settings.Speed = Level.CurrentLevel.StartSpeed;
		Settings.SetNewStages (Level.CurrentLevel.Stages, Level.CurrentLevel.StartSpeed);


		if (Level.CurrentLevel.ID == 0) {
			//Menu Backgrund Level
			ChangeMusic (Level.CurrentLevel.Music);
			Statics.GameRunning = false;
			Bird.SetActive(false);
			HideGameGUI();
			ShowWallet();
			Statics.CurrentMenuPage.Show(true);

		} else {
			LoadHighScore(Level.CurrentLevel.ID);
			Statics.GameRunning = true;
			PowerUpSpawner.instance.Reset ();
			bc.resetBird();
			LevelMenu.Hide();
			ShowGameGUI();
			HideWallet();
			HideMainMenu ();
			UpdateBackground();

		}
	}

	public void LoadHighScore(int LevelID) {
		if (Level.CurrentLevel != null) {
			if (Level.CurrentLevel.HighScore == null)
				Level.CurrentLevel.HighScore = new HighScore();
			Level.CurrentLevel.HighScore.Time = ObscuredPrefs.GetFloat ("HighScore_Time_Level_" + LevelID.ToString ());
			Level.CurrentLevel.HighScore.Score = ObscuredPrefs.GetInt ("HighScore_Score_Level_" + LevelID.ToString ());
			Level.CurrentLevel.HighScore.Streak = ObscuredPrefs.GetInt ("HighScore_Streak_Level_" + LevelID.ToString ());
		}
	}
	

	public void EndGame() {
		Invoke("HideGameGUI", 1.5f);
		Invoke("ShowWallet", 1.5f);
		Invoke("ShowScoreBoard", 1.5f);
	}

	public void MainMenu() {
		bc.resetBird();
		bc.gameObject.SetActive (false);
		LoadLevel (0);
	}

	public void QuickPlay() {
		int LevelID = Level.CurrentLevel.ID;
		if (LevelID == 0)
			LevelID = 1;
		LoadLevel (LevelID);
	}



	public void ChangeMusic(AudioClip clip) {

		Settings.music.Stop ();
		Settings.music.pitch = 1;
		Settings.music.clip = clip;
		Settings.music.Play ();
	}

	public void HideWallet() {
		GUIWallet.GetComponent<LocalTween> ().Hide ();
		GUIArchievments.GetComponent<LocalTween> ().Hide ();
	}

	public void ShowWallet() {
		GUIWallet.GetComponent<LocalTween> ().Show ();
		GUIArchievments.GetComponent<LocalTween> ().Show ();
	}

	public void HideMainMenu() {
		GUIMainMenu.GetComponent<LocalTween> ().Hide ();
	}
	
	public void ShowMainMenu() {
		GUIMainMenu.GetComponent<LocalTween> ().Show ();
	}

	void HideGameGUI() {
		GUIScore.GetComponent<LocalTween> ().Hide ();
		GUITime.GetComponent<LocalTween> ().Hide ();
		GUIStreak.GetComponent<LocalTween> ().Hide ();
	}

	void ShowGameGUI() {
		GUIScore.GetComponent<LocalTween> ().Show ();
		GUITime.GetComponent<LocalTween> ().Show ();
		GUIStreak.GetComponent<LocalTween> ().Show ();
	}


	public void ShowScoreBoard() {
		ScoreBoard.Show();
		GUIRetryButton.GetComponent<LocalTween> ().Show ();
		GUILeaderboardButton.GetComponent<LocalTween> ().Show ();
		GUIMenuButton.GetComponent<LocalTween> ().Show ();
	}

	public void HideScoreBoard() {
		ScoreBoard.Hide();
		GUIRetryButton.GetComponent<LocalTween> ().Hide ();
		GUILeaderboardButton.GetComponent<LocalTween> ().Hide ();
		GUIMenuButton.GetComponent<LocalTween> ().Hide ();
	}

	public void ResetScore() {
		GuiScoreLabel.text = "0";
		GuiStreakLabel.text = "0";
		GuiTimeLabel.text = "0:00";
		Statics.ResetCurrentScore ();
	}



	public void UpdateBackground() {
		//Setting Background Sprites
		SkyCamera.backgroundColor = Level.CurrentLevel.SkyboxColor;

		BackgroundLayer SkyLayer = Level.CurrentLevel.Background_Sky;
		BackgroundSprite Sky1 = SkyLayer.Images[Random.Range(0, SkyLayer.Images.Length)];
		BackgroundSprite Sky2 = SkyLayer.Images[Random.Range(0, SkyLayer.Images.Length)];
		BackgroundSprite Sky3 = SkyLayer.Images[Random.Range(0, SkyLayer.Images.Length)];
		
		BackgroundLayer BgLayer = Level.CurrentLevel.Background_Bg;
		BackgroundSprite Bg1 = BgLayer.Images[Random.Range(0, BgLayer.Images.Length)];
		BackgroundSprite Bg2 = BgLayer.Images[Random.Range(0, BgLayer.Images.Length)];
		BackgroundSprite Bg3 = BgLayer.Images[Random.Range(0, BgLayer.Images.Length)];
		
		BackgroundLayer MgLayer = Level.CurrentLevel.Background_Mg;
		BackgroundSprite Mg1 = MgLayer.Images[Random.Range(0, MgLayer.Images.Length)];
		BackgroundSprite Mg2 = MgLayer.Images[Random.Range(0, MgLayer.Images.Length)];
		BackgroundSprite Mg3 = MgLayer.Images[Random.Range(0, MgLayer.Images.Length)];
		
		BackgroundLayer FgLayer = Level.CurrentLevel.Background_Fg;
		BackgroundSprite Fg1 = FgLayer.Images[Random.Range(0, FgLayer.Images.Length)];
		BackgroundSprite Fg2 = FgLayer.Images[Random.Range(0, FgLayer.Images.Length)];
		BackgroundSprite Fg3 = FgLayer.Images[Random.Range(0, FgLayer.Images.Length)];

		if (BackgroundSky1.enabled) {
			NGUITools.SetActive(BackgroundSky1.gameObject, true);
			BackgroundSky1.atlas = SkyLayer.Atlas;
			BackgroundSky1.spriteName = Sky1.SpriteName;
			BackgroundSky1.height = Sky1.Height;
			BackgroundSky1.transform.localPosition = new Vector3(BackgroundSky1.transform.localPosition.x, Sky1.y, 0);
		} else {
			NGUITools.SetActive(BackgroundSky1.gameObject, false);
		}

		if (BackgroundSky2.enabled) {
			NGUITools.SetActive(BackgroundSky2.gameObject, true);
			BackgroundSky2.atlas = SkyLayer.Atlas;
			BackgroundSky2.spriteName = Sky2.SpriteName;
			BackgroundSky2.height = Sky2.Height;
			BackgroundSky2.transform.localPosition = new Vector3(BackgroundSky2.transform.localPosition.x, Sky2.y, 0);
		} else {
			NGUITools.SetActive(BackgroundSky2.gameObject, false);
		}

		if (BackgroundSky3.enabled) {
			NGUITools.SetActive(BackgroundSky3.gameObject, true);
			BackgroundSky3.atlas = SkyLayer.Atlas;
			BackgroundSky3.spriteName = Sky3.SpriteName;
			BackgroundSky3.height = Sky3.Height;
			BackgroundSky3.transform.localPosition = new Vector3(BackgroundSky3.transform.localPosition.x, Sky3.y, 0);
		} else {
			NGUITools.SetActive(BackgroundSky3.gameObject, false);
		}

		if (BackgroundBg1.enabled) {
			NGUITools.SetActive(BackgroundBg1.gameObject, true);
			BackgroundBg1.atlas = BgLayer.Atlas;
			BackgroundBg1.spriteName = Bg1.SpriteName;
			BackgroundBg1.height = Bg1.Height;
			BackgroundBg1.transform.localPosition = new Vector3(BackgroundBg1.transform.localPosition.x, Bg1.y, 0);
		} else {
			NGUITools.SetActive(BackgroundBg1.gameObject, false);
		}

		if (BackgroundBg2.enabled) {
			NGUITools.SetActive(BackgroundBg2.gameObject, true);
			BackgroundBg2.atlas = BgLayer.Atlas;
			BackgroundBg2.spriteName = Bg2.SpriteName;
			BackgroundBg2.height = Bg2.Height;
			BackgroundBg2.transform.localPosition = new Vector3(BackgroundBg2.transform.localPosition.x, Bg2.y, 0);
		} else {
			NGUITools.SetActive(BackgroundBg2.gameObject, false);
		}

		if (BackgroundBg3.enabled) {
			NGUITools.SetActive(BackgroundBg3.gameObject, true);
			BackgroundBg3.atlas = BgLayer.Atlas;
			BackgroundBg3.spriteName = Bg3.SpriteName;
			BackgroundBg3.height = Bg3.Height;
			BackgroundBg3.transform.localPosition = new Vector3(BackgroundBg3.transform.localPosition.x, Bg3.y, 0);
		} else {
			NGUITools.SetActive(BackgroundBg3.gameObject, false);
		}

		if (BackgroundMg1.enabled) {
			NGUITools.SetActive(BackgroundMg1.gameObject, true);
			BackgroundMg1.atlas = MgLayer.Atlas;
			BackgroundMg1.spriteName = Mg1.SpriteName;
			BackgroundMg1.height = Mg1.Height;
			BackgroundMg1.transform.localPosition = new Vector3(BackgroundMg1.transform.localPosition.x, Mg1.y, 0);
		} else {
			NGUITools.SetActive(BackgroundMg1.gameObject, false);
		}

		if (BackgroundMg2.enabled) {
			NGUITools.SetActive(BackgroundMg2.gameObject, true);
			BackgroundMg2.atlas = MgLayer.Atlas;
			BackgroundMg2.spriteName = Mg2.SpriteName;
			BackgroundMg2.height = Mg2.Height;
			BackgroundMg2.transform.localPosition = new Vector3(BackgroundMg2.transform.localPosition.x, Mg2.y, 0);
		} else {
			NGUITools.SetActive(BackgroundMg2.gameObject, false);
		}

		if (BackgroundMg3.enabled) {
			NGUITools.SetActive(BackgroundMg3.gameObject, true);
			BackgroundMg3.atlas = MgLayer.Atlas;
			BackgroundMg3.spriteName = Mg3.SpriteName;
			BackgroundMg3.height = Mg3.Height;
			BackgroundMg3.transform.localPosition = new Vector3(BackgroundMg3.transform.localPosition.x, Mg3.y, 0);
		} else {
			NGUITools.SetActive(BackgroundMg3.gameObject, false);
		}

		if (BackgroundFg1.enabled) {
			NGUITools.SetActive(BackgroundFg1.gameObject, true);
			BackgroundFg1.atlas = FgLayer.Atlas;
			BackgroundFg1.spriteName = Fg1.SpriteName;
			BackgroundFg1.height = Fg1.Height;
			BackgroundFg1.transform.localPosition = new Vector3(BackgroundFg1.transform.localPosition.x, Fg1.y, 0);
		} else {
			NGUITools.SetActive(BackgroundFg1.gameObject, false);
		}

		if (BackgroundFg2.enabled) {
			NGUITools.SetActive(BackgroundFg2.gameObject, true);
			BackgroundFg2.atlas = FgLayer.Atlas;
			BackgroundFg2.spriteName = Fg2.SpriteName;
			BackgroundFg2.height = Fg2.Height;
			BackgroundFg2.transform.localPosition = new Vector3(BackgroundFg2.transform.localPosition.x, Fg2.y, 0);
		} else {
			NGUITools.SetActive(BackgroundFg2.gameObject, false);
		}

		if (BackgroundFg3.enabled) {
			NGUITools.SetActive(BackgroundFg3.gameObject, true);
			BackgroundFg3.atlas = FgLayer.Atlas;
			BackgroundFg3.spriteName = Fg3.SpriteName;
			BackgroundFg3.height = Fg3.Height;
			BackgroundFg3.transform.localPosition = new Vector3(BackgroundFg3.transform.localPosition.x, Fg3.y, 0);
		} else {
			NGUITools.SetActive(BackgroundFg3.gameObject, false);
		}
	}
}

[System.Serializable]
public struct GameStage {
	public float Duration;
	public float SpeedMultiplier;
	public float DifficultiMultiplier;
}

[System.Serializable]
public class LevelObject {
	public int ID;
	public string Name;
	public GameMode GameMode;
	public float StartSpeed = 0.8f;
	//public float MaxSpeed = 2f;
	//public float SpeedGain = 0.011f;
	public AudioClip Music;
	public GameStage[] Stages;
	public propObj[] Props;
	public BackgroundLayer Background_Sky;
	public BackgroundLayer Background_Bg;
	public BackgroundLayer Background_Mg;
	public BackgroundLayer Background_Fg;
	public Color32 SkyboxColor;
	
	public int Price = 10000;
	public GameObject PlayButton;
	
	[HideInInspector]
	public HighScore HighScore = new HighScore();
}

[System.Serializable]
public class BackgroundLayer {
	public float Slack = 0.5f;
	public UIAtlas Atlas;
	public bool Enabled = true;
	public BackgroundSprite[] Images;
}

[System.Serializable]
public class BackgroundSprite {
	public string SpriteName = "";
	public int Height;
	public float y = 0f;
}


public class HighScore {
	public float Time;
	public int Streak;
	public int Score;
	public string Today;
	public float Today_Time;
	public int Today_Streak;
	public int Today_Score;
}

