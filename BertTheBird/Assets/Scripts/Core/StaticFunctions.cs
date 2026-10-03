using UnityEngine;
using System.Collections;
using System;

public static class StaticFunction {
	public static void RefreshSocialButtons(bool Success) {
		foreach (GameObject SocialBtn in GameObject.FindGameObjectsWithTag("SocialButton")) {
			SocialBtn.GetComponent<SocialButton>().DoPostAction(Success);
		}
	}
}


public static class Format {
	// Format.Number(1000) = 1,000
	public static string Number(float number) {
		string result = number.ToString("#,#");
		result = result.Length > 0 ? result : "0";
		return result;
	}

	// Format.ShortDate(Datetime.Now) = 2000-12-12
	public static string ShortDate(System.DateTime date) {
		return date.ToString("yyyy-MM-dd");
	}

	// Format.Time(float, bool) = 5:30 / 5:30:687
	public static string Time(float time, bool ShowMilliseconds) {
		int seconds = (int)time;
		int milliseconds = (int)((time - (float)seconds) * 100);
		int minutes = (int)seconds / 60;
		
		string min = minutes.ToString();
		string sec = (seconds - (minutes * 60)).ToString();
		string mil = milliseconds.ToString();
		
		if (sec.Length == 1) {
			sec = "0" + sec;
		}
		return min + ":" + sec + (ShowMilliseconds ? ":" + mil : "");
	}

	public static Int64 DateTimeInMilliseconds(DateTime date) {
		return (Int64)(date - new DateTime (1970, 1, 1)).TotalMilliseconds;
	}
}