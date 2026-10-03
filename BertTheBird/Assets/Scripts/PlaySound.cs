using UnityEngine;

public class PlaySound : MonoBehaviour
{

	public enum Trigger
	{
		OnClick,
		OnRelease,
		Other
	}
	public Trigger trigger = Trigger.OnClick;


	void OnPress (bool isPressed)
	{
		if (isPressed && trigger == Trigger.OnClick) {
			GetComponent<AudioSource>().pitch = 1;
			GetComponent<AudioSource>().Play();
		}
		if (!isPressed && trigger == Trigger.OnRelease)
			GetComponent<AudioSource>().pitch = 1;
			GetComponent<AudioSource>().Play();
	}

	public void PlayOneShot() {
		PlayOneShot (1);
	}

	public void PlayOneShot(float pitch) {
		GetComponent<AudioSource>().pitch = pitch;
		GetComponent<AudioSource>().Play ();
	}
}
