using UnityEngine;
using System.Collections;

public class FocusScript : MonoBehaviour {
	bool isActive = false;
	bool isFullyActive = false;
	bool isDeactivating = false;
	float TimeLeft = 0f;

	float transTime = 2f;
	float transTimePassed = 0f;
	float transLerpPosition = 0f;

	public GameSpeed gs;
	public BirdController Bird;
	public AudioSource Music;
	public float Duration;
	AudioSource ClassicalMusic;
	Animator anim;


	public ShopItemScript FocusTimeItem;





	// Use this for initialization
	void Start () {
		ClassicalMusic = GetComponent<AudioSource> ();

	}

	void OnEnable() {
		anim = Bird.anim;
		Duration = 10 + (FocusTimeItem.currentAmount * 5);

		Activate (Duration);


	}

	void Activate(float time) {
		isActive = true;
		isFullyActive = false;
		TimeLeft = time;
		gs.SetTempStage (new GameStage (){Duration = 0f, SpeedMultiplier = 0.7f, DifficultiMultiplier = 1f});
	}

	void FixedUpdate() {
		TimeLeft -= Time.deltaTime;
		if (isActive && !isFullyActive) {
			Show();
		}

		if (isActive && TimeLeft < 0f) {
			Hide();
		}

	}

	void Show() {
		transLerpPosition = transTimePassed / transTime;

		Music.pitch = Mathf.Lerp (1f, 0f, transLerpPosition);
		anim.speed = Mathf.Lerp (1f, 0.4f, transLerpPosition); 


		if (transTimePassed >= transTime) {

			Music.pitch = 0f;
			anim.speed = 0.4f;
			transTimePassed = 0f;
			isFullyActive = true;
			GetComponent<AudioSource>().Stop ();
			GetComponent<AudioSource>().volume = Settings.Audio.MusicVolume != 0 ? 1f : 0f;
			GetComponent<AudioSource>().Play ();
			return;
		}
		transTimePassed += Time.deltaTime;
	}

	void Hide() {
		if (!isDeactivating) {
			isDeactivating = true;
			gs.StopTempStage();
		}

		transLerpPosition = transTimePassed / transTime;
		
		Music.pitch = Mathf.Lerp (0f, 1f, transLerpPosition);
		anim.speed = Mathf.Lerp (0.6f, 1f, transLerpPosition);
		GetComponent<AudioSource>().volume = Mathf.Lerp (1f, 0f, transLerpPosition);

		
		if (transTimePassed >= transTime) {

			Music.pitch = 1f;
			anim.speed = 1f;
			transTimePassed = 0f;
			isDeactivating = false;
			isFullyActive = false;
			isActive = false;
			GetComponent<AudioSource>().Stop ();
			NGUITools.SetActive(gameObject,false);
			return;
		}
		transTimePassed += Time.deltaTime;
	}

	public void StopPowerUp() {
		TimeLeft = 0f;
	}
}
