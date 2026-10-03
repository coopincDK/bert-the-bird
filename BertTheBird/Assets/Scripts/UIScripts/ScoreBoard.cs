using UnityEngine;
using System.Collections;

public class ScoreBoard : MonoBehaviour {
	public AudioClip ScoreboardMusic;
	public Transform fb;
	public Transform tw;
    UILabel ScoreHighScore;
    UILabel StreakHighScore;
    UILabel TimeHighScore;
    UILabel Score;
    UILabel Streak;
    UILabel Time;
	TweenScale EntranceTween;
	public TweenScale HighScoreScore;
	public TweenScale HighScoreTime;
	public TweenScale HighScoreStreak;


	AudioSource Explotion;

    public void Start() {
		Explotion = transform.GetComponent<AudioSource> ();
        ScoreHighScore = transform.FindChild("ScoreHighScore").GetComponent<UILabel>();
        StreakHighScore = transform.FindChild("StreakHighScore").GetComponent<UILabel>();
        TimeHighScore = transform.FindChild("TimeHighScore").GetComponent<UILabel>();
        Score = transform.FindChild("Score").GetComponent<UILabel>();
        Streak = transform.FindChild("Streak").GetComponent<UILabel>();
        Time = transform.FindChild("Time").GetComponent<UILabel>();
        EntranceTween = transform.GetComponent<TweenScale>();
		NGUITools.SetActive (gameObject, false);

	}

	// Use this for initialization
	public void Show () {
		HighScore CurrentHighScore = Level.GetHighScore(Level.CurrentLevel.ID);
		Level.SaveScore(Level.CurrentLevel.ID, Statics.time, Statics.Score, Statics.BestStreak, System.DateTime.UtcNow);
		float delay = 1;
		float distance = 0.4f;
		
		if (Statics.Score > CurrentHighScore.Score) {
			Invoke("ShowHSScore", delay);
			delay += distance;
		}
		
		if (Statics.time > CurrentHighScore.Time) {
			Invoke("ShowHSTime", delay);
			delay += distance;
		}
		
		if (Statics.BestStreak > CurrentHighScore.Streak) {
			Invoke("ShowHSStreak", delay);
			delay += distance;
		}



		Invoke ("PlayExplosion", 0.4f);
		Statics.Dying = false; //just to stop the AudioSource from Pitching
		Statics.ShowingScoreBoard = true;
		Level.Control.ChangeMusic (ScoreboardMusic);
		ShowSocial ();
		NGUITools.SetActive (gameObject, true);
        
        ScoreHighScore.text = Format.Number(Level.CurrentLevel.HighScore.Score);
		StreakHighScore.text = Level.CurrentLevel.HighScore.Streak.ToString();
		TimeHighScore.text = Format.Time(Level.CurrentLevel.HighScore.Time, false);
        Score.text = Format.Number(Statics.Score);
        Streak.text = Statics.BestStreak.ToString();
        Time.text = Format.Time(Statics.time, false);

		transform.localPosition = Vector3.zero;
		EntranceTween.ResetToBeginning ();
        EntranceTween.PlayForward();




        
		Game.Wallet.AddStars (Statics.Score, 0.5f);
		SyncData.Sync ();
	}

	public void Hide () {
		Statics.ShowingScoreBoard = false;
		HideSocial ();
		HideNewHighScore ();
		NGUITools.SetActive (gameObject, false);
	}

	public void PlayExplosion() {
		Explotion.Play ();
	}

	void ShowSocial() {
		fb.GetComponent<SocialButton> ().Show ();
		tw.GetComponent<SocialButton> ().Show ();
	}

	void HideSocial() {
		fb.GetComponent<SocialButton> ().Hide ();
		tw.GetComponent<SocialButton> ().Hide ();
	}





	void ShowHSScore() {
		ShowNewHighScore ("score");
	}
	void ShowHSTime() {
		ShowNewHighScore ("time");
	}
	void ShowHSStreak() {
		ShowNewHighScore ("streak");
	}

	void ShowNewHighScore(string type) {
		if (type == "score") {
			NGUITools.SetActive(HighScoreScore.gameObject, true);
			HighScoreScore.ResetToBeginning();
			HighScoreScore.PlayForward();
		}
		else if (type == "time") {
			NGUITools.SetActive(HighScoreTime.gameObject, true);
			HighScoreTime.ResetToBeginning();
			HighScoreTime.PlayForward();
		}
		else if (type == "streak") {
			NGUITools.SetActive(HighScoreStreak.gameObject, true);
			HighScoreStreak.ResetToBeginning();
			HighScoreStreak.PlayForward();
		}
	}

	void HideNewHighScore() {
		NGUITools.SetActive(HighScoreScore.gameObject, false);
		NGUITools.SetActive(HighScoreTime.gameObject, false);
		NGUITools.SetActive(HighScoreStreak.gameObject, false);
	}

}
