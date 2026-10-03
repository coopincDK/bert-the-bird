using UnityEngine;
using CodeStage.AntiCheat.ObscuredTypes;

public class LoadLevel : MonoBehaviour {
	public int LevelID;
	public MenuPage HidePage;
	public MenuPage ShowPage;
	public LevelControl LevelController;
	UILabel TimeRecord;
	UILabel ScoreRecord;
	UILabel StreakRecord;
	UILabel Name;
	Transform LockMask;
	UILabel Price;
	UISprite LevelImage;

	void Start () {
		TimeRecord = transform.FindChild ("Time").GetComponent<UILabel> ();
		ScoreRecord = transform.FindChild ("Score").GetComponent<UILabel> ();
		StreakRecord = transform.FindChild ("Streak").GetComponent<UILabel> ();
		Name = transform.FindChild ("Name").GetComponent<UILabel> ();
		LockMask = transform.FindChild ("LockMask");
		Price = LockMask.FindChild ("Price").GetComponent<UILabel> ();
		LevelImage = transform.FindChild ("Image").GetComponent<UISprite> ();
		Refresh ();
	}


	public void Refresh () {
		if (ObscuredPrefs.GetBool("Level_" + LevelID + "_Unlocked")) {
			NGUITools.SetActive(LockMask.gameObject, false);
		}
		else {
			NGUITools.SetActive(LockMask.gameObject, true);
			Price.text = Format.Number(LevelController.Levels[LevelID].Price);
		}
		Name.text = LevelController.Levels [LevelID].Name;
		LevelImage.spriteName = "Level" + LevelID.ToString ();
		RefreshScores ();
	}

	public void RefreshScores() {
		HighScore ActualHighScore = Level.GetHighScore (LevelID);
		TimeRecord.text = Format.Time(ActualHighScore.Time, false);
		ScoreRecord.text = ActualHighScore.Score.ToString ();
		StreakRecord.text = ActualHighScore.Streak.ToString();
	}



	void OnClick () {
		if (ObscuredPrefs.GetBool("Level_" + LevelID + "_Unlocked")) {
			Level.Load (LevelID);
		} else {
			//temp
			ObscuredPrefs.SetBool("Level_" + LevelID + "_Unlocked", true); 
			Refresh();
			SyncData.Edit.AddLevels(LevelID);
		}




		if (HidePage != null) {
			HidePage.Hide();
		}
		if (ShowPage != null) {
			ShowPage.Show();
		}
	}
}
