import numpy as np

def make_coin_gate(coin_type='hadamard', angles=None):
    if coin_type == 'hadamard':
        return np.array([[1, 1], [1, -1]]) / np.sqrt(2)
    elif coin_type == 'biased':
        theta = angles[0] if angles else np.pi / 6
        return np.array([[np.cos(theta/2), -np.sin(theta/2)],
                         [np.sin(theta/2), np.cos(theta/2)]])
    elif coin_type == 'custom' and angles:
        theta, phi = angles[0], (angles[1] if len(angles) > 1 else 0)
        cy = np.array([[np.cos(theta/2), -np.sin(theta/2)],
                       [np.sin(theta/2), np.cos(theta/2)]])
        cz = np.array([[1, 0], [0, np.exp(1j * phi)]])
        return cz @ cy
    else:
        return np.array([[1, 1], [1, -1]]) / np.sqrt(2)

def simulate_qwalk(n_positions, steps, coin_type='hadamard', coin_angles=None, start_pos=0):
    pos_dim = n_positions
    dim = 2 * pos_dim
    state = np.zeros(dim, dtype=complex)
    state[(start_pos << 1) + 0] = 1.0
    C = make_coin_gate(coin_type, coin_angles)

    def shift_vector(vec):
        new = np.zeros_like(vec)
        for pos in range(pos_dim):
            for coin in (0, 1):
                idx = (pos << 1) + coin
                amp = vec[idx]
                if abs(amp) < 1e-12:
                    continue
                new_pos = (pos - 1) % pos_dim if coin == 0 else (pos + 1) % pos_dim
                new_idx = (new_pos << 1) + coin
                new[new_idx] += amp
        return new

    for _ in range(steps):
        new_state = np.zeros_like(state)
        for pos in range(pos_dim):
            a0, a1 = state[(pos << 1) + 0], state[(pos << 1) + 1]
            b0 = C[0, 0] * a0 + C[0, 1] * a1
            b1 = C[1, 0] * a0 + C[1, 1] * a1
            new_state[(pos << 1) + 0], new_state[(pos << 1) + 1] = b0, b1
        state = shift_vector(new_state)

    probs = [abs(state[(i << 1) + 0])**2 + abs(state[(i << 1) + 1])**2 for i in range(pos_dim)]
    return probs
