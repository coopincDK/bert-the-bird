using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;



public enum Orientation {
	Horisontal,
	Vertical
}

public enum BackgroundLayers {
	Sky,
	Bg,
	Mg,
	Fg
}

public enum GameMode {
	Default,
	Flappy
}

public static class Statics  {
	//menu
	public static MenuPage CurrentMenuPage;

	//default sounds
	public static class Sounds {
		public static PlaySound Explosion;
		public static PlaySound Point;
		public static PlaySound Pop;
		public static PlaySound StarAdd;
		public static PlaySound GemAdd;
	}

	//BirdController
	public static BirdController BirdController;

	//RewardCacheStatics
	public static ObscuredInt Reward = 0;
	public static bool PendingSocalPost = false;

	//GameStatics
	public static bool ShowingScoreBoard = false;
	public static bool GameRunning = false;
	public static bool PreWarmMode = true;
	public static bool Dying = false;
	public static bool Dead = false;
	public static bool PowerUpActive = false;
	public static ObscuredInt Score = 0;
	public static ObscuredInt Multiplier = 0;
	public static ObscuredInt BestStreak = 0;
	public static ObscuredFloat time = 0;
	public static int seconds = 0;
	public static void ResetTime() {
		time = 0;
		seconds = 0;
	}
	public static void ResetCurrentScore() {
		ResetTime ();
		Statics.Score = 0;
		Statics.Multiplier = 0;
		Statics.BestStreak = 0;
	}

	public static void ClearPendingSocalPost() {
		Statics.Reward = 0;
		PendingSocalPost = false;
	}
}

public class StaticVariables : MonoBehaviour  {
	public UILabel PointLabel;
	TweenScale PointTween;
	public UILabel MultiplierLabel;
	TweenScale MultiplierTween;
	public UILabel TimeLabel;
	TweenScale TimeTween;

	public PlaySound Explotion;
	public PlaySound PointSound;
	public PlaySound StarAdd;
	public PlaySound GemAdd;
	public PlaySound Pop;

	void Start() {
		Statics.Sounds.Explosion = Explotion;
		Statics.Sounds.Point = PointSound;
		Statics.Sounds.StarAdd = StarAdd;
		Statics.Sounds.GemAdd = GemAdd;
		Statics.Sounds.Pop = Pop;


		PointTween = PointLabel.GetComponent<TweenScale> ();
		MultiplierTween = MultiplierLabel.GetComponent<TweenScale> ();
		TimeTween = TimeLabel.GetComponent<TweenScale> ();
		Statics.ResetCurrentScore ();
	}

	void Update() {
		if (Statics.GameRunning && !Statics.PreWarmMode) {
			Statics.time += Time.deltaTime;
			UpdateTime();
		}
	}

	void UpdateTime() {
		//int minutes = (int)Statics.time / 60;
		if (Statics.time > Statics.seconds) {

			//string min = minutes.ToString();
			//string sec = (Statics.seconds - (minutes * 60)).ToString();
			//if (sec.Length == 1) {
			//	sec = "0" + sec;
			//}
			//TimeLabel.text = min + ":" + sec;
			TimeLabel.text = Format.Time(Statics.time, false);
			TimeTween.ResetToBeginning();
			TimeTween.PlayForward();
			Statics.seconds++;
		}

	}


	public void IncreaseScore() {

		Statics.Multiplier += 1;
		if (Statics.Multiplier > Statics.BestStreak) 
			Statics.BestStreak = Statics.Multiplier;

		Statics.Score += Statics.Multiplier;
		PointLabel.text = Statics.Score.ToString();
		PointTween.ResetToBeginning();
		PointTween.PlayForward();

		MultiplierLabel.text = "x" + Statics.Multiplier;
		MultiplierTween.ResetToBeginning();
		MultiplierTween.PlayForward();;
	}

	public void KillMultiplier() {
		if (Statics.Multiplier > Statics.BestStreak) 
			Statics.BestStreak = Statics.Multiplier;

		Statics.Multiplier = 0;
		MultiplierLabel.text = "0";
		MultiplierTween.ResetToBeginning();
		MultiplierTween.PlayForward();
	}


}

