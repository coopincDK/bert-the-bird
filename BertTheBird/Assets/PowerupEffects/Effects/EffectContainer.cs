using UnityEngine;
using System.Collections;

public class EffectContainer : MonoBehaviour {
	public Transform bird;
	public bool FollowPosition;
	public Vector2 PositionOffset;
	public bool FollowRotation;

	public float RotateSpeed = 0;

	// Update is called once per frame
	void LateUpdate () {
		if (FollowPosition) {
				transform.position = new Vector3(bird.position.x + PositionOffset.x, bird.position.y + PositionOffset.y, transform.position.z);
		}
		//.088
		//	0.433
		if (FollowRotation) {
			transform.rotation = bird.rotation;
		}

		if (RotateSpeed != 0) {
			transform.Rotate (Vector3.forward * RotateSpeed * Time.deltaTime);

		}
	}
}
