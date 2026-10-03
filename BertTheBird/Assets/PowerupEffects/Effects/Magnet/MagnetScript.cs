using UnityEngine;
using System.Collections;

public class MagnetScript : MonoBehaviour
{
	public LayerMask m_MagneticLayers;
	public float Duration;
	public float m_Radius;
	public float m_Force;
	bool isActive = false;
	bool isFullyActive = false;
	bool isDeactivating = false;
	public AudioClip PowerUpSound;
	public AudioClip PowerDownSound;
	public ShopItemScript MagnetRadiusItem;
	public ShopItemScript MagnetTimeItem;
	Transform VisualEffect;

	float TimeLeft = 0f;


	void Awake() {
		VisualEffect = transform.FindChild ("Visual");
	}

	void OnEnable() {
		Duration = 10 + (MagnetTimeItem.currentAmount * 5);
		m_Radius = 1.6f + (MagnetRadiusItem.currentAmount);

		float scale = ((float)m_Radius / 6f) + 0.2f;
		VisualEffect.localScale = new Vector3 (scale, scale, 1);




		Activate (Duration);
		//audio.Play ();
		StartCoroutine (StartSound ());
	}

	IEnumerator StartSound() {
		GetComponent<AudioSource>().PlayOneShot (PowerUpSound);
		yield return new WaitForSeconds (PowerUpSound.length);
		GetComponent<AudioSource>().Play();
	}

	void StopSound() {
		GetComponent<AudioSource>().Stop ();
		GetComponent<AudioSource>().PlayOneShot (PowerDownSound);
	}


	void Update() {
		if (isActive) {
			if (!isFullyActive) {
				//ShowAnimation (scale)
				transform.localScale = Vector3.Lerp(transform.localScale, new Vector3(1,1,1), 3f * Time.deltaTime);
				if (transform.localScale.x >= 0.98) {
					transform.localScale = new Vector3(1,1,1);
					isFullyActive = true;
				}
			} 
			TimeLeft -= Time.deltaTime;
			if (TimeLeft < 0) {
				if (!isDeactivating) {
					isDeactivating = true;
					StopSound();
				}
				Deactivate();
			}

		
		}
	}


	void FixedUpdate ()
	{
		if (isActive) {
			Drag ();	
		}
	}

	void Drag() {
		Collider2D collider;
		
		collider = Physics2D.OverlapCircle (transform.position, m_Radius, m_MagneticLayers);
		//foreach (Collider2D collider in colliders)
		//{
		if (collider != null) {
			GameObject other = collider.gameObject;
			if (other != null && other.tag != "Point") {
				//continue;
			} else {
				Vector3 current = other.transform.position;
				Vector3 goal = transform.position;
				
				other.transform.position = Vector3.MoveTowards (current, goal, m_Force * Time.deltaTime);
			}
			
			//}
		}
	}


	void OnDrawGizmosSelected ()
	{
		Gizmos.color = Color.red;
		Gizmos.DrawWireSphere (transform.position, m_Radius);
	}

	void Activate(float time) {
		//if (!isActive) {
			transform.localScale = Vector3.zero;
			isActive = true;
			isFullyActive = false;
			TimeLeft = time;
		//}
	}

	public void StopPowerUp() {
		if (!isFullyActive)
			isFullyActive = true;
		
		TimeLeft = 0;
	}

	void Deactivate() {

		transform.localScale = Vector3.Lerp(transform.localScale, new Vector3(0,0,0), 4 * Time.deltaTime);
		if (transform.localScale.x <= 0.1) {
			transform.localScale = new Vector3(0,0,0);
			isActive = false;
		}

		if (!isActive) {
			Statics.PowerUpActive = false;
			isDeactivating = false;
			gameObject.SetActive (false);
		}



	}
}